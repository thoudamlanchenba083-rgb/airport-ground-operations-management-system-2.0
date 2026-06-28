"""
UI Tests for Airport Ground Operations Management System
Uses Selenium with Chrome in headless mode.
Run with: python manage.py test core_app.ui_tests --verbosity=2

NOTE: Requires the Django dev server to be running:
      python manage.py runserver
"""

import unittest
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager


BASE_URL = 'http://127.0.0.1:5501/frontend/pages'
ADMIN_USERNAME = 'admin'
ADMIN_PASSWORD = 'adminpass123'


def get_driver():
    options = Options()
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--window-size=1280,800')
    options.add_argument('--disable-gpu')
    options.add_argument('--log-level=3')
    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=options
    )
    driver.implicitly_wait(5)
    return driver


# ─────────────────────────────────────────
# LOGIN PAGE TESTS
# ─────────────────────────────────────────

class LoginPageUITest(unittest.TestCase):

    def setUp(self):
        self.driver = get_driver()

    def tearDown(self):
        self.driver.quit()

    def test_login_page_loads(self):
        """Login page should load with a username input."""
        self.driver.get(f'{BASE_URL}/index.html')
        time.sleep(2)  # wait for React to render
        body = self.driver.find_element(By.TAG_NAME, 'body').text
        self.assertIn('Sign in', body)

    def test_login_page_has_username_and_password_fields(self):
        """Login form must have username and password inputs."""
        self.driver.get(f'{BASE_URL}/index.html')
        time.sleep(2)
        inputs = self.driver.find_elements(By.TAG_NAME, 'input')
        types = [i.get_attribute('type') for i in inputs]
        self.assertIn('text', types)
        self.assertIn('password', types)

    def test_login_empty_submit_stays_on_page(self):
        """Submitting empty form should not redirect."""
        self.driver.get(f'{BASE_URL}/index.html')
        time.sleep(2)
        btn = self.driver.find_element(By.CSS_SELECTOR, 'button[type="submit"]')
        btn.click()
        time.sleep(1)
        self.assertIn('index.html', self.driver.current_url)

    def test_login_wrong_credentials_shows_error(self):
        """Wrong credentials should show an error message."""
        self.driver.get(f'{BASE_URL}/index.html')
        time.sleep(2)
        inputs = self.driver.find_elements(By.TAG_NAME, 'input')
        for inp in inputs:
            if inp.get_attribute('type') == 'text':
                inp.send_keys('wronguser')
            elif inp.get_attribute('type') == 'password':
                inp.send_keys('wrongpass')
        btn = self.driver.find_element(By.CSS_SELECTOR, 'button[type="submit"]')
        btn.click()
        time.sleep(3)
        body = self.driver.find_element(By.TAG_NAME, 'body').text
        self.assertTrue(
            'Invalid' in body or 'incorrect' in body.lower() or 'error' in body.lower(),
            msg=f'Expected error message, got: {body[:200]}'
        )

    def test_password_toggle_shows_password(self):
        """Eye icon should toggle password visibility."""
        self.driver.get(f'{BASE_URL}/index.html')
        time.sleep(2)
        pw_input = None
        for inp in self.driver.find_elements(By.TAG_NAME, 'input'):
            if inp.get_attribute('type') == 'password':
                pw_input = inp
                break
        self.assertIsNotNone(pw_input, 'Password input not found')
        toggle = self.driver.find_element(By.CSS_SELECTOR, '.ptoggle')
        toggle.click()
        time.sleep(0.5)
        self.assertEqual(pw_input.get_attribute('type'), 'text')

    def test_remember_me_checkbox_toggles(self):
        """Remember me checkbox should be clickable."""
        self.driver.get(f'{BASE_URL}/index.html')
        time.sleep(2)
        rmb = self.driver.find_element(By.CSS_SELECTOR, '.rmb')
        chk = self.driver.find_element(By.CSS_SELECTOR, '.chk')
        initial_class = chk.get_attribute('class')
        rmb.click()
        time.sleep(0.3)
        new_class = chk.get_attribute('class')
        self.assertNotEqual(initial_class, new_class)

    def test_back_to_home_link_exists(self):
        """Login page should have a back to home link."""
        self.driver.get(f'{BASE_URL}/index.html')
        time.sleep(2)
        links = self.driver.find_elements(By.TAG_NAME, 'a')
        texts = [l.text.lower() for l in links]
        self.assertTrue(any('home' in t or 'back' in t for t in texts))


# ─────────────────────────────────────────
# SIGNUP PAGE TESTS
# ─────────────────────────────────────────

class SignupPageUITest(unittest.TestCase):

    def setUp(self):
        self.driver = get_driver()

    def tearDown(self):
        self.driver.quit()

    def test_signup_page_loads(self):
        """Signup page should load with Create Account text."""
        self.driver.get(f'{BASE_URL}/signup.html')
        time.sleep(1)
        body = self.driver.find_element(By.TAG_NAME, 'body').text
        self.assertIn('Create', body)

    def test_signup_has_required_fields(self):
        """Signup form must have username, email, password fields."""
        self.driver.get(f'{BASE_URL}/signup.html')
        time.sleep(1)
        inputs = self.driver.find_elements(By.TAG_NAME, 'input')
        types = [i.get_attribute('type') for i in inputs]
        self.assertIn('text', types)
        self.assertIn('email', types)
        self.assertIn('password', types)

    def test_signup_no_admin_role_option(self):
        """ADMIN must not be selectable in the signup role dropdown."""
        self.driver.get(f'{BASE_URL}/signup.html')
        time.sleep(1)
        selects = self.driver.find_elements(By.TAG_NAME, 'select')
        for select in selects:
            options = select.find_elements(By.TAG_NAME, 'option')
            values = [o.get_attribute('value') for o in options]
            self.assertNotIn('ADMIN', values, 'ADMIN role should not be in signup dropdown')

    def test_signup_password_mismatch_shows_error(self):
        """Mismatched passwords should show an error."""
        self.driver.get(f'{BASE_URL}/signup.html')
        time.sleep(1)
        inputs = self.driver.find_elements(By.TAG_NAME, 'input')
        pw_inputs = [i for i in inputs if i.get_attribute('type') == 'password']
        if len(pw_inputs) >= 2:
            pw_inputs[0].send_keys('password123')
            pw_inputs[1].send_keys('different456')
        btn = self.driver.find_element(By.CSS_SELECTOR, 'button[type="submit"]')
        btn.click()
        time.sleep(1)
        body = self.driver.find_element(By.TAG_NAME, 'body').text
        self.assertTrue(
            'match' in body.lower() or 'password' in body.lower(),
            msg=f'Expected password mismatch error, got: {body[:200]}'
        )

    def test_signup_has_login_link(self):
        """Signup page should have a link back to login."""
        self.driver.get(f'{BASE_URL}/signup.html')
        time.sleep(1)
        links = self.driver.find_elements(By.TAG_NAME, 'a')
        texts = [l.text.lower() for l in links]
        self.assertTrue(any('login' in t or 'sign in' in t for t in texts))


# ─────────────────────────────────────────
# RUN
# ─────────────────────────────────────────

if __name__ == '__main__':
    unittest.main()