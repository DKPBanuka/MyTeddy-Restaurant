export class UpdateSettingsDto {
  restaurantName?: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
  currencySymbol?: string;
  taxRate?: number;
  serviceCharge?: number;
  packagingCharge?: number;
  receiptFooter?: string;
  qrCodeUrl?: string;
  wifiPassword?: string;
  partyExclusiveCharge?: number;
  partyAdvancePercentage?: number;
}
