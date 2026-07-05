from abc import ABC, abstractmethod
from typing import Dict, Any

class BasePlugin(ABC):
    """
    Abstract base class for all ThreatStream Execution Engine plugins & connectors.
    """

    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}

    @abstractmethod
    def initialize(self) -> bool:
        """
        Sets up connections, validates credential api keys, and verifies binary paths.
        Returns True if initialization succeeds.
        """
        pass

    @abstractmethod
    def authenticate(self) -> bool:
        """
        Tests authentication credentials against the remote provider API.
        Returns True if authentication succeeds, False otherwise.
        """
        pass

    @abstractmethod
    def validate(self, payload: Dict[str, Any]) -> bool:
        """
        Validates target parameters, scopes, IP formats, hashes, and configurations.
        Returns True if payload parameters are correct.
        """
        pass

    @abstractmethod
    def execute(self, payload: Dict[str, Any], progress_callback=None) -> Dict[str, Any]:
        """
        Executes the main task logic.
        Periodically publishes progress through the progress_callback(progress_int).
        Returns a dict of results.
        """
        pass

    @abstractmethod
    def health(self) -> Dict[str, Any]:
        """
        Gathers connector runtime metrics: status, latency, authentication state, and remaining quotas.
        Returns a dict containing: status, quota_remaining, last_successful_sync, etc.
        """
        pass

    @abstractmethod
    def cleanup(self) -> bool:
        """
        Frees sockets, closes DB streams, terminates subprocesses, and removes temp files.
        Returns True if cleanup completes successfully.
        """
        pass
