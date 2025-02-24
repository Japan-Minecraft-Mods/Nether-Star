// 必要なファイルのインポート
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, MessageFlags, EmbedBuilder } = require('discord.js');
const { token } = require('./config.json');
const { searchMod, fetchModInfo } = require(path.join(__dirname, 'scripts', 'modrinth_search'));
console.log('modrinth_search.jsが正しく読み込まれました');
const deployCommands = require('./deploy-commands');
const client = new Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]});

// クライアントの準備ができたら、このコードを実行します (1 回のみ)。
// `client: Client<boolean>` と `readyClient: Client<true>` の区別は、TypeScript 開発者にとって重要です。
// これにより、一部のプロパティが null 非許容になります。
client.once(Events.ClientReady, async readyClient => {
    await deployCommands();
    console.log(`${readyClient.user.tag}でログインしました。`);
});
client.commands = new Collection();

// コマンドファイルを読み込む
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        // コマンドが正しく設定されているか確認
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] ${filePath} のコマンドには"data" または "execute" プロパティがありません。`);
        }
    }
}

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
        await interaction.reply({ content: 'このコマンドの実行中にエラーが発生しました', flags: MessageFlags.Ephemeral });
    }
});

client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;

    // 正規表現を修正して、最後の文字まで正しく取得できるようにする
    const modrinthUrlPattern = /https?:\/\/modrinth\.com\/mod\/([a-zA-Z0-9]{8,})/;
    const match = message.content.match(modrinthUrlPattern);

    if (match) {
        const modId = match[1];

        try {
            // MOD情報の取得
            const { modData, versionRange, author, authorIcon, authorUrl, category } = await fetchModInfo(modId);

            // ローダー情報の整形
            const loaders = modData.loaders?.map(loader => loader.charAt(0).toUpperCase() + loader.slice(1)).join(', ') || 'ローダーなし';

            const modEmbed = new EmbedBuilder()
                .setColor(0x1bd96a)
                .setAuthor({
                    name: author,
                    iconURL: authorIcon || null,
                    url: authorUrl || '#',
                })
                .setTitle(modData.title || 'タイトルなし')
                .setURL(`https://modrinth.com/mod/${modData.id}`)
                .setThumbnail(modData.icon_url || '')
                .addFields(
                    { name: '', value: modData.description || '概要なし' },
                    { name: 'Loader', value: loaders, inline: true },
                    { name: 'Version', value: versionRange, inline: true },
                    { name: 'Downloads', value: modData.downloads?.toLocaleString() || '0', inline: true },
                )
                .setFooter({ text: `Modrinth ${modData.project_type.charAt(0).toUpperCase() + modData.project_type.slice(1) || 'Mod'}  |  ${category}` })
                .setTimestamp(new Date(modData.published));

            await message.channel.send({ embeds: [modEmbed] });

        } catch (error) {
            console.error('MOD情報の取得中にエラーが発生しました: ', error);
            // サーバーのチャンネルにエラーメッセージを送信する
            await message.channel.send({ content: `エラーが発生しました: ${error.message}`, flags: MessageFlags.Ephemeral });
        }
    }
});

// クライアントのトークンを使用してログイン
client.login(token);