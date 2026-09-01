import sendStreamingCommand from "../src/lib/google/streamingCommand";

const code = process.argv.slice(2).join(" ") || "console.";
console.log(await sendStreamingCommand({ code }));
