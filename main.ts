import Handlebars from "npm:handlebars";
import { parseArgs } from "https://deno.land/std@0.221.0/cli/mod.ts";
import { difference } from "https://deno.land/std@0.221.0/datetime/mod.ts";


const encoder = new TextEncoder();
async function writeErr(msg: string) {
  return await Deno.stderr.write(encoder.encode(msg));
}


async function exists(path: string) {
  try {
    await Deno.lstat(path);
    return true;
  } catch {
    return false;
  }
}

const helpers = {
  "years-since": function (text: string) {
    const date = new Date(text);
    const diff = difference(date, new Date(), {
      units: ["years"]
    });
    return diff.years;
  }
};

async function help() {
  return await writeErr(
    `Usage:
hbars [-o|--output file] <.hbs-template file> <.json-data file>

Inject json data into a handlebars template file.
The default output file is set to the path of the .hbs file, without the .hbs extension.

Examples:
    
  hbars template.tex.hbs data.json - outputs to template.tex

  hbars template.tex.hbs example.json -o example.tex - outputs to example.tex
`
  );
}

async function main() {
  const args = parseArgs(Deno.args);


  if (args['help'] || args['h'] || args['?'] || args['\\?'] || Deno.args.length == 0) {
    await help();
    return;
  }

  const hbs = args['_'].find(it => `${it}`.endsWith(".hbs"));
  const json = args['_'].find(it => `${it}`.endsWith(".json"));

  let o = args['o'] || args['output'];
  if (!hbs || !(await exists(hbs as string))) {
    await writeErr("ERROR: Please provide a single .hbs template file.\n");
    return;
  }
  if (!json || !(await exists(json as string))) {
    await writeErr("ERROR: Please provide a single .json data file.\n");
    return;
  }
  if (!o) {
    o = (hbs as string).replace(/\.hbs$/, '');
    await writeErr(`WARNING: No output path set, using default path: ${o}.\n`);
  }


  for (const [key, func] of Object.entries(helpers)) {
    Handlebars.registerHelper(key, func);
  }

  let raw = await Deno.readTextFile(json as string);
  if ((o as string).endsWith(".tex")) {
    // Escape special characters in .tex files.
    raw = raw.replaceAll("#", "\\\\#").replaceAll("&", "\\\\&");
  }
  const data = JSON.parse(raw);
  const content = await Deno.readTextFile(hbs as string);
  const template = Handlebars.compile(content);
  const output = template(data);
  await Deno.writeTextFile(o as string, output);
}

await main();
