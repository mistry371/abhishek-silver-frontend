import { FacebookIcon, InstagramIcon, PinterestIcon, YouTubeIcon } from "@/components/icons";
import { siteConfig, type SocialPlatform } from "@/config/site";
import { cn } from "@/lib/utils";

const icons: Record<SocialPlatform, typeof InstagramIcon> = {
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  youtube: YouTubeIcon,
  pinterest: PinterestIcon,
};

export function SocialLinks({ tone = "dark", className }: { tone?: "dark" | "light"; className?: string }) {
  if (siteConfig.socialLinks.length === 0) return null;
  return (
    <ul className={cn("flex gap-2", className)} aria-label="Social media">
      {siteConfig.socialLinks.map(({ id, label, href }) => {
        const Icon = icons[id];
        return (
          <li key={id}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${siteConfig.name} on ${label}`}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border transition-colors",
                tone === "light" ? "border-onyx-line text-ivory/70 hover:border-ivory/60 hover:text-ivory" : "border-line text-ink hover:border-ink",
              )}
            >
              <Icon size={17} />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
