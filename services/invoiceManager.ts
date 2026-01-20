
import { Invoice } from '../types';

export class InvoiceManager {
  private static COMPANY_NIF = "B12345678";
  private static lastHash = "0000000000000000000000000000000000000000000000000000000000000000";

  /**
   * Encadena la factura actual con la anterior generando un hash SHA-256 (simulado).
   * Veri*Factu exige que cada factura contenga el hash de la anterior.
   */
  public static async certifyInvoice(invoice: Invoice, patientDni: string): Promise<{ hash: string, qr: string }> {
    const dataToHash = `${this.lastHash}|${invoice.invoiceNumber}|${invoice.date}|${invoice.amount}|${patientDni}`;
    
    // Simulación de hashing SHA-256
    const newHash = btoa(dataToHash).substring(0, 32).toUpperCase();
    this.lastHash = newHash;

    const qrUrl = `https://verifactu.aeat.es/qr/${invoice.invoiceNumber}?nif=${this.COMPANY_NIF}&hash=${newHash}`;

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          hash: newHash,
          qr: qrUrl
        });
      }, 1200);
    });
  }
}
