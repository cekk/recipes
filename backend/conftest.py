import os

# We set fake environment variables so that when importing app/modules that
# initialize global settings objects, pydantic doesn't crash during pytest collection.
os.environ["GITHUB_TOKEN"] = "fake-github-token"
os.environ["GITHUB_REPO"] = "fake-user/fake-repo"
os.environ["API_KEY"] = "fake-api-key"
os.environ["GEMINI_API_KEY"] = "fake-gemini-key"
os.environ["GOOGLE_CLIENT_ID"] = ""
os.environ["ALLOWED_EMAILS"] = ""
