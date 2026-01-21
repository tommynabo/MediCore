import os
import requests
from dotenv import load_dotenv

load_dotenv()

class FacturaDirectaClient:
    def __init__(self):
        self.api_key = os.getenv("FACTURA_DIRECTA_KEY")
        self.client_id = os.getenv("FACTURA_DIRECTA_CID")
        
        # Determine environment (Sandbox vs Production)
        # Using the CID convention from the Node.js code: contains "sandbox" -> sandbox env
        self.is_sandbox = "sandbox" in (self.client_id or "")
        
        if self.is_sandbox:
             self.base_url = f"https://sandbox.facturadirecta.com/api"
        else:
             self.base_url = f"https://app.facturadirecta.com/api"

        if not self.api_key or not self.client_id:
            print("⚠️ ADVERTENCIA: Faltan credenciales de FacturaDirecta (FACTURA_DIRECTA_KEY, FACTURA_DIRECTA_CID)")
            
    def _get_headers(self):
        return {
            "facturadirecta-api-key": self.api_key,
            "Content-Type": "application/json"
        }

    def sync_patient(self, patient_data):
        """
        Synchronizes a patient with FacturaDirecta contacts.
        Checks if exists by fiscalId (DNI), if so updates, else creates.
        Returns the internal FD contact UUID.
        """
        if not self.api_key or not self.client_id:
            raise Exception("Credenciales de FacturaDirecta no configuradas")

        owner_url = f"{self.base_url}/owners/{self.client_id}/contacts" # Corrected URL structure based on Node.js finding
        # Nodejs used: https://app.facturadirecta.com/api/{CID} -> which seemed strictly for that owner
        # Let's align with the Node.js implementation which was successful in finding via:
        # GET /contacts?fiscalId=... 
        # But wait, Node.js code had: `https://app.facturadirecta.com/api/${FACTURA_DIRECTA_CID}/contacts`
        
        # Let's follow that pattern exactly:
        base_owner_url = f"{self.base_url}/{self.client_id}"

        # 1. Search by Fiscal ID
        fiscal_id = patient_data.get("dni")
        if fiscal_id:
            print(f"🔎 [FD] Buscando contacto {fiscal_id}...")
            try:
                search_url = f"{base_owner_url}/contacts"
                response = requests.get(search_url, params={"fiscalId": fiscal_id}, headers=self._get_headers(), timeout=10)
                response.raise_for_status()
                data = response.json()
                
                if data.get("items"):
                    contact = data["items"][0]
                    contact_id = contact.get("uuid") or contact.get("id")
                    print(f"✅ [FD] Contacto encontrado: {contact_id}")
                    # Optionally update here if needed, for now just return ID
                    return contact_id
            except Exception as e:
                print(f"⚠️ Error buscando contacto: {e}")

        # 2. Create if not found
        print(f"➕ [FD] Creando nuevo contacto...")
        payload = {
            "content": {
                "type": "contact",
                "main": {
                    "name": patient_data.get("name"),
                    "fiscalId": fiscal_id or "00000000T",
                    "email": patient_data.get("email"),
                    "address": patient_data.get("address", ""),
                    "city": patient_data.get("city", ""),
                    "zipcode": patient_data.get("zipCode", ""),
                    "country": "ES",
                    "currency": "EUR",
                    "accounts": { "client": "430000" }
                }
            }
        }
        
        try:
            create_url = f"{base_owner_url}/contacts"
            response = requests.post(create_url, json=payload, headers=self._get_headers(), timeout=10)
            response.raise_for_status()
            data = response.json()
            contact_id = data.get("content", {}).get("uuid") or data.get("content", {}).get("id")
            return contact_id
        except Exception as e:
            print(f"❌ Error creando contacto: {e}")
            if hasattr(e, 'response') and e.response:
                print(e.response.text)
            raise e

    def create_invoice(self, patient_fd_id, items, type="invoice"):
        """
        Creates an invoice for the given contact and items.
        """
        base_owner_url = f"{self.base_url}/{self.client_id}"
        
        # Series logic
        if self.is_sandbox:
            series = "TEST"
        elif type == "rectificative":
            series = "R"
        else:
            series = "F"

        lines = []
        for item in items:
            lines.append({
                "text": item.get("name"),
                "quantity": 1,
                "unitPrice": float(item.get("price")),
                "tax": ["S_IVA_0"] # Medical services 0% / Exempt. Adjust code if needed.
            })

        payload = {
            "content": {
                "type": "invoice",
                "main": {
                    "docNumber": { "series": series },
                    "date":  None, # API defaults to today if null usually, or current date
                    "currency": "EUR",
                    "contact": patient_fd_id,
                    "lines": lines,
                    # "paymentType": "CASH" # Optional
                }
            }
        }
        
        # Add current date
        from datetime import datetime
        payload["content"]["main"]["date"] = datetime.now().strftime("%Y-%m-%d")

        print(f"🔌 [FD] Enviando factura a FacturaDirecta...")
        try:
            url = f"{base_owner_url}/invoices"
            response = requests.post(url, json=payload, headers=self._get_headers(), timeout=15)
            response.raise_for_status()
            data = response.json()
            
            content = data.get("content", {})
            invoice_id = content.get("uuid") or content.get("id")
            
            # Get PDF
            pdf_url = ""
            try:
                pdf_res = requests.put(f"{url}/{invoice_id}/pdf", headers=self._get_headers(), timeout=10)
                if pdf_res.status_code == 200:
                    pdf_url = pdf_res.json().get("url")
            except Exception as pdf_e:
                print(f"⚠️ Error obteniendo PDF: {pdf_e}")

            return {
                "success": True,
                "invoice_id": invoice_id,
                "invoice_number": f"{content['main']['docNumber']['series']}{content['main']['docNumber']['number']}",
                "pdf_url": pdf_url,
                "uuid_verifactu": content.get("AEAT", {}).get("hash") # Placeholder for Verifactu data
            }

        except Exception as e:
            print(f"❌ Error emitiendo factura: {e}")
            if hasattr(e, 'response') and e.response:
                print(e.response.text)
            raise e
