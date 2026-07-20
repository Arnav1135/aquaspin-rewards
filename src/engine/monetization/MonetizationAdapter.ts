// src/engine/monetization/MonetizationAdapter.ts

export interface AdProvider {
  showRewardedVideo: () => Promise<boolean>;
  showInterstitial: () => Promise<boolean>;
}

export interface PurchaseItem {
  id: string;
  title: string;
  price: number;
}

export interface IAPProvider {
  purchaseItem: (itemId: string) => Promise<boolean>;
  getItems: () => Promise<PurchaseItem[]>;
}

export class MonetizationAdapter {
  private static adProvider?: AdProvider;
  private static iapProvider?: IAPProvider;

  public static setAdProvider(provider: AdProvider) {
    this.adProvider = provider;
  }

  public static setIAPProvider(provider: IAPProvider) {
    this.iapProvider = provider;
  }

  public static async showRewardedVideo(): Promise<boolean> {
    if (this.adProvider) {
      return this.adProvider.showRewardedVideo();
    }
    return true; // Safe no-op fallback
  }

  public static async showInterstitial(): Promise<boolean> {
    if (this.adProvider) {
      return this.adProvider.showInterstitial();
    }
    return true; // Safe no-op fallback
  }

  public static async purchaseItem(itemId: string): Promise<boolean> {
    if (this.iapProvider) {
      return this.iapProvider.purchaseItem(itemId);
    }
    return false; // Safe no-op fallback
  }
}
