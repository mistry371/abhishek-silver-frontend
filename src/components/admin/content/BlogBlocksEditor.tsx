"use client";

import { PlusIcon } from "@/components/icons";
import { SelectInput, TextArea, TextInput } from "../fields";
import { AdminButton } from "../ui";
import { errorAt, scopeErrors, type FieldErrors } from "./errors";
import { ImageField } from "./fields";
import { ListEditor, StringListEditor } from "./ListEditor";
import type { BlogBlock } from "./types";

type BlockType = BlogBlock["type"];

const blockTypes: { type: BlockType; label: string; create: () => BlogBlock }[] = [
  { type: "paragraph", label: "Paragraph", create: () => ({ type: "paragraph", text: "" }) },
  { type: "heading", label: "Heading", create: () => ({ type: "heading", text: "", level: 2 }) },
  { type: "image", label: "Image", create: () => ({ type: "image", image: { url: "", alt: "" }, caption: "" }) },
  { type: "quote", label: "Quote", create: () => ({ type: "quote", text: "", cite: "" }) },
  { type: "list", label: "Bulleted list", create: () => ({ type: "list", items: [""] }) },
];

const blockLabels = Object.fromEntries(blockTypes.map((block) => [block.type, block.label])) as Record<BlockType, string>;

function preview(block: BlogBlock) {
  switch (block.type) {
    case "paragraph":
    case "heading":
    case "quote":
      return block.text;
    case "image":
      return block.caption || block.image.alt;
    case "list":
      return block.items.filter(Boolean).join(" · ");
  }
}

/** Article body editor: paragraphs, headings, images, quotes and bulleted lists. */
export function BlogBlocksEditor({ blocks, onChange, errors = {} }: { blocks: BlogBlock[]; onChange: (blocks: BlogBlock[]) => void; errors?: FieldErrors }) {
  return (
    <ListEditor<BlogBlock>
      label="Article content"
      description="Build the article from blocks and use the arrows to reorder them."
      items={blocks}
      max={200}
      error={errors[""]}
      emptyText="No content yet. Add a paragraph to start writing."
      onChange={(next) => onChange(next)}
      addActions={(add, full) =>
        blockTypes.map((block) => (
          <AdminButton key={block.type} size="sm" disabled={full} onClick={() => add(block.create())}>
            <PlusIcon size={14} />
            {block.label}
          </AdminButton>
        ))
      }
      itemTitle={(block) => (
        <>
          <span className="font-medium">
            {blockLabels[block.type]}
            {block.type === "heading" ? ` · H${block.level}` : ""}
          </span>
          {preview(block) && <span className="ml-2 text-muted">{preview(block)}</span>}
        </>
      )}
      renderItem={(block, index, update) => <BlockFields block={block} onChange={update} errors={scopeErrors(errors, index)} />}
    />
  );
}

function BlockFields({ block, onChange, errors }: { block: BlogBlock; onChange: (block: BlogBlock) => void; errors: FieldErrors }) {
  switch (block.type) {
    case "paragraph":
      return <TextArea label="Paragraph" required rows={5} maxLength={5000} value={block.text} error={errors.text} onChange={(event) => onChange({ ...block, text: event.target.value })} />;
    case "heading":
      return (
        <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <SelectInput
            label="Level"
            value={String(block.level)}
            error={errors.level}
            options={[
              { value: "2", label: "Section (H2)" },
              { value: "3", label: "Sub-section (H3)" },
            ]}
            onChange={(event) => onChange({ ...block, level: event.target.value === "3" ? 3 : 2 })}
          />
          <TextInput label="Heading" required maxLength={200} value={block.text} error={errors.text} onChange={(event) => onChange({ ...block, text: event.target.value })} />
        </div>
      );
    case "image":
      return (
        <div className="grid gap-3">
          <ImageField label="Image" required value={block.image} error={errorAt(errors, "image")} onChange={(image) => onChange({ ...block, image: image ?? { url: "", alt: "" } })} />
          <TextInput label="Caption" maxLength={300} value={block.caption ?? ""} error={errors.caption} onChange={(event) => onChange({ ...block, caption: event.target.value })} />
        </div>
      );
    case "quote":
      return (
        <div className="grid gap-3">
          <TextArea label="Quote" required rows={3} maxLength={1000} value={block.text} error={errors.text} onChange={(event) => onChange({ ...block, text: event.target.value })} />
          <TextInput label="Attribution" maxLength={120} hint="Optional — who said it." value={block.cite ?? ""} error={errors.cite} onChange={(event) => onChange({ ...block, cite: event.target.value })} />
        </div>
      );
    case "list":
      return (
        <StringListEditor
          label="Bullet points"
          items={block.items}
          multiline={false}
          min={1}
          max={30}
          maxLength={500}
          itemLabel="Point"
          addLabel="Add point"
          errors={scopeErrors(errors, "items")}
          onChange={(items) => onChange({ ...block, items })}
        />
      );
  }
}
