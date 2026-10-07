import { buildCommandIndex } from "@/lib/command-index";
import { CommandPalette } from "@/components/command/command-palette";

/** Server half of the palette: builds the index once per request and hands it over. */
export async function CommandMenu() {
  const items = await buildCommandIndex();
  return <CommandPalette items={items} />;
}
