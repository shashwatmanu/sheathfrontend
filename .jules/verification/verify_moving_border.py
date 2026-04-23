from playwright.sync_api import sync_playwright

def verify_moving_border():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Set access token to bypass login
        page.context.add_cookies([{
            "name": "access_token",
            "value": "dummy_token_for_verification",
            "domain": "localhost",
            "path": "/"
        }])

        # Navigate to dashboard where buttons with MovingBorder are likely used
        try:
            page.goto("http://localhost:3000/dashboard", timeout=30000)
            page.wait_for_load_state("networkidle")

            # Inject token into localStorage as well, just in case
            page.evaluate("localStorage.setItem('access_token', 'dummy_token_for_verification')")

            # Take a screenshot
            page.screenshot(path=".jules/verification/moving_border_verification.png")
            print("Screenshot captured successfully.")

        except Exception as e:
            print(f"Error during verification: {e}")
            # Try capturing what we have
            page.screenshot(path=".jules/verification/moving_border_error.png")

        finally:
            browser.close()

if __name__ == "__main__":
    verify_moving_border()
