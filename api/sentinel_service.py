"""
Pre-flight risk sentinel service for migration safety checks.
Runs a battery of checks before executing a migration.
"""

import logging
from dataclasses import dataclass
from typing import Literal, Optional
import asyncio

from .base_service import BaseService
from .yield_service import YieldService
from .gas_service import GasService

logger = logging.getLogger("liquidityvector.sentinel")


# Risk thresholds
LIQUIDITY_DEPTH_WARN_THRESHOLD = 0.05  # 5% of pool TVL
LIQUIDITY_DEPTH_FAIL_THRESHOLD = 0.10  # 10% of pool TVL
CONCENTRATION_WARN_THRESHOLD = 0.05    # 5% of pool
CONCENTRATION_FAIL_THRESHOLD = 0.10    # 10% of pool
PROTOCOL_RISK_WARN_THRESHOLD = 70      # Risk score below this warns
PROTOCOL_RISK_FAIL_THRESHOLD = 50      # Risk score below this fails
GAS_ANOMALY_THRESHOLD = 2.0            # Current gas > 2x average


@dataclass
class RiskCheck:
    """Single pre-flight check result."""
    name: str
    status: Literal["pass", "warn", "fail"]
    message: str
    severity: int  # 1-5 scale (5 is most severe)
    
    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "status": self.status,
            "message": self.message,
            "severity": self.severity,
        }


class SentinelService(BaseService):
    """Pre-flight risk assessment service."""
    
    def __init__(self, client, gas_service: Optional[GasService] = None):
        super().__init__(client)
        self.gas_service = gas_service or GasService(client)
    
    async def run_preflight_checks(
        self,
        migration_amount: float,
        target_pool_tvl: float,
        target_chain: str,
        protocol_name: str,
        risk_score: int = 75,  # Default moderate score
    ) -> list[RiskCheck]:
        """
        Run all pre-flight safety checks in parallel.
        
        Args:
            migration_amount: Amount being migrated in USD
            target_pool_tvl: Target pool TVL in USD
            protocol_name: Name of target protocol
            risk_score: Protocol risk score (0-100)
            target_chain: Target chain for gas check
            
        Returns:
            List of RiskCheck results
        """
        checks = await asyncio.gather(
            self._check_liquidity_depth(migration_amount, target_pool_tvl),
            self._check_protocol_risk(protocol_name, risk_score),
            self._check_concentration_risk(migration_amount, target_pool_tvl),
            self._check_gas_conditions(target_chain),
            return_exceptions=True
        )
        
        # Filter out exceptions and log them
        results = []
        for check in checks:
            if isinstance(check, Exception):
                logger.warning(f"Pre-flight check failed with exception: {check}")
                results.append(RiskCheck(
                    name="Check Error",
                    status="warn",
                    message=f"Could not complete check: {str(check)[:50]}",
                    severity=2
                ))
            else:
                results.append(check)
        
        return results
    
    async def _check_liquidity_depth(
        self,
        migration_amount: float,
        pool_tvl: float,
    ) -> RiskCheck:
        """Check if migration amount is too large relative to pool."""
        if pool_tvl <= 0:
            return RiskCheck(
                name="Liquidity Depth",
                status="warn",
                message="Unable to verify pool TVL",
                severity=3
            )
        
        ratio = migration_amount / pool_tvl
        
        if ratio >= LIQUIDITY_DEPTH_FAIL_THRESHOLD:
            return RiskCheck(
                name="Liquidity Depth",
                status="fail",
                message=f"Migration is {ratio*100:.1f}% of pool TVL - high slippage risk",
                severity=5
            )
        elif ratio >= LIQUIDITY_DEPTH_WARN_THRESHOLD:
            return RiskCheck(
                name="Liquidity Depth",
                status="warn",
                message=f"Migration is {ratio*100:.1f}% of pool TVL - moderate slippage expected",
                severity=3
            )
        else:
            return RiskCheck(
                name="Liquidity Depth",
                status="pass",
                message=f"Migration is {ratio*100:.2f}% of pool TVL - adequate liquidity",
                severity=1
            )
    
    async def _check_protocol_risk(
        self,
        protocol_name: str,
        risk_score: int,
    ) -> RiskCheck:
        """Check protocol risk score."""
        if risk_score < PROTOCOL_RISK_FAIL_THRESHOLD:
            return RiskCheck(
                name="Protocol Safety",
                status="fail",
                message=f"{protocol_name} has a low safety score ({risk_score}/100)",
                severity=5
            )
        elif risk_score < PROTOCOL_RISK_WARN_THRESHOLD:
            return RiskCheck(
                name="Protocol Safety",
                status="warn",
                message=f"{protocol_name} has a moderate safety score ({risk_score}/100)",
                severity=3
            )
        else:
            return RiskCheck(
                name="Protocol Safety",
                status="pass",
                message=f"{protocol_name} has a good safety score ({risk_score}/100)",
                severity=1
            )
    
    async def _check_concentration_risk(
        self,
        migration_amount: float,
        pool_tvl: float,
    ) -> RiskCheck:
        """Check if user position would be too concentrated in pool."""
        if pool_tvl <= 0:
            return RiskCheck(
                name="Concentration Risk",
                status="warn",
                message="Unable to verify position concentration",
                severity=2
            )
        
        ratio = migration_amount / pool_tvl
        
        if ratio >= CONCENTRATION_FAIL_THRESHOLD:
            return RiskCheck(
                name="Concentration Risk",
                status="fail",
                message=f"Position would be {ratio*100:.1f}% of pool - excessive concentration",
                severity=4
            )
        elif ratio >= CONCENTRATION_WARN_THRESHOLD:
            return RiskCheck(
                name="Concentration Risk",
                status="warn",
                message=f"Position would be {ratio*100:.1f}% of pool - elevated concentration",
                severity=3
            )
        else:
            return RiskCheck(
                name="Concentration Risk",
                status="pass",
                message=f"Position would be {ratio*100:.2f}% of pool - well distributed",
                severity=1
            )
    
    async def _check_gas_conditions(
        self,
        chain: str,
    ) -> RiskCheck:
        """Check if gas prices are currently elevated."""
        try:
            from .models import Chain
            
            # Normalize chain string to enum
            chain_enum = Chain.from_string(chain)
            
            # Get current gas price
            gas_price = await self.gas_service.get_gas_price(chain_enum)
            
            # We don't have historical average, so check against reasonable thresholds
            # These are typical "normal" gas prices in Gwei for each chain
            normal_gas = {
                Chain.Ethereum: 30,
                Chain.Arbitrum: 0.1,
                Chain.Base: 0.01,
                Chain.Optimism: 0.01,
                Chain.Polygon: 50,
                Chain.Avalanche: 30,
                Chain.BNBChain: 5,
            }
            
            threshold = normal_gas.get(chain_enum, 30) * GAS_ANOMALY_THRESHOLD
            
            if gas_price > threshold:
                return RiskCheck(
                    name="Gas Conditions",
                    status="warn",
                    message=f"Gas is elevated ({gas_price:.1f} Gwei) - consider waiting",
                    severity=2
                )
            else:
                return RiskCheck(
                    name="Gas Conditions",
                    status="pass",
                    message=f"Gas is normal ({gas_price:.1f} Gwei)",
                    severity=1
                )
        except Exception as e:
            logger.warning(f"Gas check failed: {e}")
            return RiskCheck(
                name="Gas Conditions",
                status="warn",
                message="Could not verify gas conditions",
                severity=2
            )
    
    def get_overall_status(self, checks: list[RiskCheck]) -> Literal["pass", "warn", "fail"]:
        """Get overall status from a list of checks."""
        if any(c.status == "fail" for c in checks):
            return "fail"
        elif any(c.status == "warn" for c in checks):
            return "warn"
        return "pass"
