import Image from "next/image";
import { slugify } from "@/lib/utils";
import type { BlogBlock } from "@/types/content";

/** Renders CMS article blocks with the editorial prose styles. */
export function BlogContent({ blocks }: { blocks: BlogBlock[] }) {
  return (
    <div className="prose-luxe">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "paragraph":
            return <p key={index}>{block.text}</p>;
          case "heading":
            return block.level === 2 ? (
              <h2 key={index} id={slugify(block.text)}>
                {block.text}
              </h2>
            ) : (
              <h3 key={index} id={slugify(block.text)}>
                {block.text}
              </h3>
            );
          case "quote":
            return (
              <blockquote key={index}>
                <p>{block.text}</p>
                {block.cite && <cite className="mt-3 block font-sans text-sm not-italic text-muted">— {block.cite}</cite>}
              </blockquote>
            );
          case "list":
            return (
              <ul key={index}>
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            );
          case "image":
            return (
              <figure key={index} className="!my-12">
                <div className="relative aspect-[4/3] overflow-hidden bg-cream">
                  <Image src={block.image.url} alt={block.image.alt} fill sizes="(min-width: 768px) 50rem, 100vw" className="object-cover" />
                </div>
                {block.caption && <figcaption className="mt-3 text-center font-sans text-sm text-muted">{block.caption}</figcaption>}
              </figure>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
