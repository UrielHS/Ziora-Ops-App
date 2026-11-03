import { describe, expect, it } from "vitest";
import { firstName, renderTemplate, templateVariables } from "./template";

describe("renderTemplate", () => {
  it("sustituye y escapa", () => {
    expect(renderTemplate("Hola {{nombre}}", { nombre: "<b>Ana</b>" })).toBe("Hola &lt;b&gt;Ana&lt;/b&gt;");
  });
  it("usa fallback", () => {
    expect(renderTemplate("Hola {{nombre | colega}}", {})).toBe("Hola colega");
  });
  it("triple llave no escapa", () => {
    expect(renderTemplate('<a href="{{{baja}}}">x</a>', { baja: "https://a.b/?t=1&x=2" })).toBe('<a href="https://a.b/?t=1&x=2">x</a>');
  });
  it("lista variables", () => {
    expect(templateVariables("{{nombre}} {{{baja}}} {{ciudad|CDMX}}").sort()).toEqual(["baja", "ciudad", "nombre"]);
  });
  it("primer nombre sin título", () => {
    expect(firstName("Psic. Andrea Ruiz")).toBe("Andrea");
    expect(firstName("Dra. Laura Gómez")).toBe("Laura");
  });
});
