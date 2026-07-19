import ipaddress
import re
from urllib.parse import urlsplit, urlunsplit

from fastapi import HTTPException, status


DOMAIN_PATTERN = re.compile(r"^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$")
REPOSITORY_PATTERN = re.compile(r"^(github|gitlab|bitbucket):([a-z0-9_.-]+(?:/[a-z0-9_.-]+)+)$")
CONTAINER_PATTERN = re.compile(r"^(?:(?P<registry>[A-Za-z0-9.-]+(?::[0-9]+)?)/)?(?P<path>[A-Za-z0-9._-]+(?:/[A-Za-z0-9._-]+)*)(?:(?P<tag>:[A-Za-z0-9_.-]{1,128})|(?P<digest>@sha256:[a-fA-F0-9]{64}))?$")


def invalid(message: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=message)


def _domain(value: str) -> str:
    candidate = value.strip().rstrip(".").lower()
    if "://" in candidate or any(char in candidate for char in "/?#:@"):
        raise invalid("Domain identifiers cannot include a scheme, port, credentials, query, or path")
    try:
        candidate = candidate.encode("idna").decode("ascii")
    except UnicodeError as exc:
        raise invalid("Domain identifier is invalid") from exc
    if not DOMAIN_PATTERN.fullmatch(candidate):
        raise invalid("Domain identifier is invalid")
    return candidate


def _url(value: str) -> str:
    try:
        parsed = urlsplit(value.strip())
        port = parsed.port
    except ValueError as exc:
        raise invalid("URL identifier is invalid") from exc
    scheme = parsed.scheme.lower()
    if scheme not in {"http", "https"} or not parsed.hostname:
        raise invalid("URL assets require an http or https URL with a hostname")
    if parsed.username or parsed.password:
        raise invalid("URL assets cannot contain credentials")
    host = _domain(parsed.hostname) if not _is_ip(parsed.hostname) else str(ipaddress.ip_address(parsed.hostname))
    if port and not ((scheme == "http" and port == 80) or (scheme == "https" and port == 443)):
        host = f"{host}:{port}"
    path = parsed.path or "/"
    return urlunsplit((scheme, host, path, parsed.query, ""))


def _is_ip(value: str) -> bool:
    try:
        ipaddress.ip_address(value)
        return True
    except ValueError:
        return False


def _repository(value: str) -> str:
    candidate = value.strip()
    if "://" in candidate:
        parsed = urlsplit(candidate)
        if parsed.scheme not in {"http", "https"} or parsed.username or parsed.password or parsed.query or parsed.fragment:
            raise invalid("Repository URL is invalid")
        providers = {"github.com": "github", "gitlab.com": "gitlab", "bitbucket.org": "bitbucket"}
        provider = providers.get((parsed.hostname or "").lower())
        path = parsed.path.strip("/")
        if not provider:
            raise invalid("Repository URLs must use GitHub, GitLab, or Bitbucket")
        candidate = f"{provider}:{path}"
    candidate = candidate.removesuffix(".git").lower()
    if not REPOSITORY_PATTERN.fullmatch(candidate):
        raise invalid("Repository identifiers use provider:owner/name or a supported repository URL")
    return candidate


def _container(value: str) -> str:
    candidate = value.strip()
    match = CONTAINER_PATTERN.fullmatch(candidate)
    if not match:
        raise invalid("Container image identifier is invalid")
    registry = (match.group("registry") or "docker.io").lower()
    path = match.group("path").lower()
    suffix = match.group("tag") or (match.group("digest") or "").lower()
    return f"{registry}/{path}{suffix}"


def normalize_identifier(asset_type: str, value: str) -> tuple[str, str]:
    candidate = value.strip()
    if not candidate or len(candidate) > 1000:
        raise invalid("Asset identifier must contain between 1 and 1000 characters")
    if asset_type in {"domain", "subdomain", "host"}:
        normalized = _domain(candidate)
    elif asset_type == "ip_address":
        try:
            normalized = str(ipaddress.ip_address(candidate))
        except ValueError as exc:
            raise invalid("IP address identifier is invalid") from exc
    elif asset_type == "url":
        normalized = _url(candidate)
    elif asset_type == "repository":
        normalized = _repository(candidate)
    elif asset_type == "container_image":
        normalized = _container(candidate)
    elif asset_type in {"cloud_account", "kubernetes_cluster", "custom"}:
        normalized = re.sub(r"\s+", " ", candidate).casefold()
    else:
        raise invalid("Unsupported asset type")
    return normalized, normalized


def normalize_tag(value: str) -> tuple[str, str]:
    display = re.sub(r"\s+", " ", value.strip())
    if not 1 <= len(display) <= 80:
        raise invalid("Tags must contain between 1 and 80 characters")
    return display, display.casefold()
