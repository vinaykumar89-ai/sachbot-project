import sys
import os

# Ensure backend and its parent directory are in Python search path
_backend_dir = os.path.dirname(os.path.abspath(__file__))
_parent_dir = os.path.dirname(_backend_dir)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)
if _parent_dir not in sys.path:
    sys.path.insert(0, _parent_dir)
