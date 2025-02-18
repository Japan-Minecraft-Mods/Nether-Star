// 必要なファイルのインポート
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits} = require('discord.js');
const { token } = require('./config.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// クライアントの準備ができたら、このコードを実行します (1 回のみ)。
// `client: Client<boolean>` と `readyClient: Client<true>` の区別は、TypeScript 開発者にとって重要です。
// これにより、一部のプロパティが null 非許容になります。
client.once(Events.ClientReady, readyClient => {
	console.log(`${readyClient.user.tag}でログインしました。`);
});
client.commands = new Collection();

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'このコマンドの実行中にエラーが発生しました。', flags: MessageFlags.Ephemeral });
		} else {
			await interaction.reply({ content: 'このコマンドの実行中にエラーが発生しました', flags: MessageFlags.Ephemeral });
		}
	}
});
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] ${filePath} のコマンドには"data" または "execute" プロパティがありません。`);
		}
	}
}

// クライアントのトークンを使用してログイン
client.login(token);