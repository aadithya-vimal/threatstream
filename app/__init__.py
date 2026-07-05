import os
# Make the legacy top-level 'app' package point to the backend app code
__path__ = [os.path.join(os.path.dirname(__file__), 'backend', 'app')]
