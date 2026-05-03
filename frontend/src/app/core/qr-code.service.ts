import { Injectable } from "@angular/core";
import * as QRCode from "qrcode";

@Injectable({
  providedIn: "root",
})
export class QrCodeService {
  toDataUrl(text: string): Promise<string> {
    return QRCode.toDataURL(text, {
      width: 220,
      margin: 1,
    });
  }
}
