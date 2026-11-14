import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GuildHeraldry } from "./guild-heraldry";

describe("GuildHeraldry", () => {
  it("draws a stable seal with initials", () => {
    const first = renderToStaticMarkup(<GuildHeraldry guildId="guild-1" name="Ashen Order" />);
    const second = renderToStaticMarkup(<GuildHeraldry guildId="guild-1" name="Ashen Order" />);
    expect(first).toBe(second);
    expect(first).toContain("<svg");
    expect(first).toContain(">AO</text>");
  });

  it("gives different guilds different shields", () => {
    const first = renderToStaticMarkup(<GuildHeraldry guildId="guild-1" name="Ashen Order" />);
    const other = renderToStaticMarkup(<GuildHeraldry guildId="guild-2" name="Jade Circle" />);
    expect(first).not.toBe(other);
  });
});
