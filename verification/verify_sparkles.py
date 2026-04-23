import time
from playwright.sync_api import sync_playwright

def verify(page):
    # Wait for server to start
    max_retries = 30
    for i in range(max_retries):
        try:
            page.goto("http://localhost:3000/auth/login", timeout=3000)
            break
        except Exception:
            if i == max_retries - 1:
                raise
            time.sleep(1)

    print("Navigated to login page")

    # Wait for sparkles to be loaded
    # The Particles component renders a div with the ID
    page.wait_for_selector("#loginSparkles", state="attached", timeout=10000)
    print("Sparkles container found")

    # Wait a bit for animation to start and canvas to be drawn
    time.sleep(2)

    # Take screenshot
    page.screenshot(path="verification/sparkles.png")
    print("Screenshot taken")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
