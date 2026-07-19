from app.domains.scans.adapters.base import ScannerAdapter,ScannerDefinition


class ScannerRegistry:
    def __init__(self):self._adapters:dict[str,ScannerAdapter]={};self._definitions={
        "trivy":ScannerDefinition("trivy","Trivy",(),"future","0","0",False),"nmap":ScannerDefinition("nmap","Nmap",(),"future","0","0",False),"semgrep":ScannerDefinition("semgrep","Semgrep",(),"future","0","0",False),"gitleaks":ScannerDefinition("gitleaks","Gitleaks",(),"future","0","0",False),"zap":ScannerDefinition("zap","OWASP ZAP",(),"future","0","0",False),"custom":ScannerDefinition("custom","Custom",(),"future","0","0",False)}
    def register(self,adapter:ScannerAdapter):self._adapters[adapter.definition.scanner_type]=adapter;self._definitions[adapter.definition.scanner_type]=adapter.definition
    def resolve(self,scanner_type:str)->ScannerAdapter:
        adapter=self._adapters.get(scanner_type)
        if adapter is None:raise ValueError("Scanner type is unknown or inactive")
        return adapter
    def definitions(self):return list(self._definitions.values())


scanner_registry=ScannerRegistry()
