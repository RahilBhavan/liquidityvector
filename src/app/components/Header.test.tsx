import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Header from './Header'

// Mock RainbowKit
vi.mock('@rainbow-me/rainbowkit', () => ({
  ConnectButton: {
    Custom: ({ children }: any) => children({
      account: { displayName: 'TestUser', displayBalance: '0 ETH' },
      chain: { name: 'Ethereum', hasIcon: false },
      openAccountModal: vi.fn(),
      openChainModal: vi.fn(),
      openConnectModal: vi.fn(),
      mounted: true,
    })
  }
}))

describe('Header Component', () => {
  it('renders without crashing', () => {
    const props = {
      walletBalance: 1000,
      canPopulate: true,
      onPopulateCapital: vi.fn()
    }
    
    const { container } = render(<Header {...props} />)
    expect(container).toBeTruthy()
    expect(screen.getByText('Use Wallet Balance')).toBeDefined()
  })
})
