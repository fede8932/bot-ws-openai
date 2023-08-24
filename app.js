require("dotenv").config();

const {
  createBot,
  createProvider,
  createFlow,
  addKeyword,
  EVENTS,
} = require("@bot-whatsapp/bot");
const QRPortalWeb = require("@bot-whatsapp/portal");
const { init } = require("bot-ws-plugin-openai");
const BaileysProvider = require("@bot-whatsapp/provider/baileys");
const MockAdapter = require("@bot-whatsapp/database/mock");
const { handlerAI } = require("./utils");
const { textToVoice } = require("./services/eventlab");

const employeesAddonConfig = {
  model: "gpt-3.5-turbo",
  temperature: 0,
  apiKey: process.env.OPENAI_API_KEY,
};

const employeesAddon = init(employeesAddonConfig);

const flowStaff = addKeyword(EVENTS.ACTION).addAnswer(
  ["Claro que te interesa?", "mejor te envio audio.."],
  null,
  async (_, { flowDynamic, state }) => {
    console.log("🙉 texto a voz....");
    const currentState = state.getMyState();
    const path = await textToVoice(currentState.answer);
    console.log(`🙉 Fin texto a voz....[PATH]:${path}`);
    await flowDynamic([{ body: "escucha", media: path }]);
  }
);

const flowVoiceNote = addKeyword(EVENTS.VOICE_NOTE).addAction(
  async (ctx, ctxFn) => {
    await ctxFn.flowDynamic("dame un momento para escucharte...🙉");
    console.log("🤖 voz a texto....");
    const text = await handlerAI(ctx);
    console.log(`🤖 Fin voz a texto....[TEXT]: ${text}`);
    const currentState = ctxFn.state.getMyState();
    console.log(currentState, "aca anda")
    const fullSentence = `${currentState?.answer ?? ""}. ${text}`;
    console.log(fullSentence, "aca anda s")
    const { employee, answer } = await employeesAddon.determine(fullSentence);
    ctxFn.state.update({ answer });
    employeesAddon.gotoFlow(employee, ctxFn);
  }
);

const main = async () => {
  const adapterDB = new MockAdapter();

  const adapterFlow = createFlow([flowVoiceNote, flowStaff]);

  const adapterProvider = createProvider(BaileysProvider);

  /**
   * 🤔 Empledos digitales
   * Imaginar cada empleado descrito con sus deberes de manera explicita
   */
  const employees = [
    {
      name: "EMPLEADO_STAFF_SELL",
      description:
        "Soy Jorge el staff amable encargado de atentender las consultas relacionadas con ventas de repuestos, mis respuestas son breves y concisas, en algunos casos intento ser persuacivo",
      flow: flowStaff,
    },
  ];

  employeesAddon.employees(employees);

  createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  });

  QRPortalWeb()
  
};

main();
