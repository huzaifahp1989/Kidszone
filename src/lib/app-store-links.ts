export const APP_STORE_LINKS = {
  ios:
    process.env.NEXT_PUBLIC_IOS_APP_URL ||
    'https://apps.apple.com/au/app/islam-media-quran-radio-hadith/id6754959416',
  android:
    process.env.NEXT_PUBLIC_ANDROID_APP_URL ||
    'https://play.google.com/store/apps/details?id=com.wnapp.id1761553570260&hl=en_GB',
};

export function hasConfiguredStoreLinks() {
  return Boolean(process.env.NEXT_PUBLIC_IOS_APP_URL || process.env.NEXT_PUBLIC_ANDROID_APP_URL);
}
