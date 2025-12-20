from locust import HttpUser, task, between

class WebsiteUser(HttpUser):
    wait_time = between(1, 5)

    @task
    def health_check(self):
        self.client.get("/health")

    @task
    def yield_check(self):
        # Smoke test main endpoint
        self.client.get("/api/yield?chain=Ethereum")
