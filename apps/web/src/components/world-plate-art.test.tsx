import { UNIVERSE_IDS } from "@endemion/game-core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WorldPlateArt } from "./world-plate-art";

describe("WorldPlateArt", () => {
  it("draws a distinct plate for every world", () => {
    const plates = UNIVERSE_IDS.map((id) => renderToStaticMarkup(<WorldPlateArt id={id} accent="#B9924F" />));
    expect(new Set(plates).size).toBe(UNIVERSE_IDS.length);

    for (const plate of plates) {
      expect(plate).toContain("<svg");
      expect(plate).toContain("<path");
    }
  });
});
