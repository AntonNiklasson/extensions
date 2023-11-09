import { getPreferenceValues, showHUD } from "@raycast/api";
import { generateParagraphs, produceOutput, safeLoremIpsumNumberArg } from "./utils";
import { LoremIpsumArguments } from "./types";

export default async function ParagraphCommand(props?: { arguments: LoremIpsumArguments }) {
  const { action = "clipboard" } = getPreferenceValues();

  const numberArg = props?.arguments.numberOfLoremIpsumsToGenerate;

  const { error, safeLoremIpsumNumber } = await safeLoremIpsumNumberArg(numberArg);

  if (error) {
    await showHUD(`❌ ${error.message}`);
  } else {
    const output = generateParagraphs(safeLoremIpsumNumber);
    await produceOutput(action, output);
  }
}
