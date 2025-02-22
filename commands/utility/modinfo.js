const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1時間
const RATE_LIMIT_INTERVAL = 2000; // 1リクエストごとに2秒間隔（分間30回以下）
let lastRequestTime = 0;

async function fetchWithRateLimit(url) {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < RATE_LIMIT_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_INTERVAL - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();

  if (cache.has(url)) {
    const { data, timestamp } = cache.get(url);
    if (Date.now() - timestamp < CACHE_TTL) return data;
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error(`APIエラー: ${response.status} (${url})`);
  const data = await response.json();
  cache.set(url, { data, timestamp: Date.now() });
  return data;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modinfo')
    .setDescription('ModrinthのMODの詳細を表示')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('MODのID、名前、またはURL')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply(); // タイムアウト防止

    const query = interaction.options.getString('query');
    let modId = query;

    // Modrinth ID の形式判定
    const modrinthIdPattern = /^[A-Za-z0-9]{8}$/;
    if (!modrinthIdPattern.test(modId)) {
      // URL から ID を抽出
      const urlMatch = query.match(/modrinth\.com\/mod\/([^\/]+)/);
      if (urlMatch) {
        modId = urlMatch[1];
      } else {
        // 名前検索 (`limit=10`) を実行
        try {
          const searchData = await fetchWithRateLimit(
            `https://api.modrinth.com/v2/search?query=${encodeURIComponent(query)}&index=downloads&limit=10`
          );
          if (searchData.hits.length === 0) {
            return interaction.followUp({ content: '該当するMODが見つかりませんでした。', flags: MessageFlags.Ephemeral });
          }
          modId = searchData.hits[0].project_id;
        } catch (error) {
          console.error(error);
          return interaction.followUp({ content: 'MODの検索に失敗しました。\n しばらく待ってからもう一度お試しください。', flags: MessageFlags.Ephemeral });
        }
      }
    }

    try {
      // MOD情報の取得（キャッシュ & レート制限付き）
      const [modData, versionsData, memberData] = await Promise.all([
        fetchWithRateLimit(`https://api.modrinth.com/v2/project/${modId}`),
        fetchWithRateLimit(`https://api.modrinth.com/v2/project/${modId}/version`),
        fetchWithRateLimit(`https://api.modrinth.com/v2/project/${modId}/members`),
      ]);

      // バージョン情報の整理
      const filteredVersions = versionsData
        .map(version => version.game_versions)
        .flat()
        .filter(version => !/[w|pre|rc]/i.test(version))
        .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

      const versionRange = filteredVersions.length > 1
        ? `${filteredVersions[0]}-${filteredVersions.at(-1)}`
        : filteredVersions[0] || 'No versions available';

      // 作者情報の取得
      let author = 'Unknown', authorIcon = '', authorUrl = '#';
      const owner = memberData.find(member => member.role === 'Owner');

      if (owner) {
        author = owner.user.username;
        authorIcon = owner.user.avatar_url;
        authorUrl = `https://modrinth.com/user/${author}`;
      } else {
        // 組織情報の取得（個人所有でない場合のみ）
        try {
          const organizationData = await fetchWithRateLimit(`https://api.modrinth.com/v3/project/${modId}/organization`);
          author = organizationData.name;
          authorIcon = organizationData.icon_url;
          authorUrl = `https://modrinth.com/organization/${organizationData.slug}`;
        } catch (error) {
          console.warn(`組織情報の取得エラー: ${error.message}`);
        }
      }

      // カテゴリー情報の整形
      const category = modData.categories?.map(cat => cat.charAt(0).toUpperCase() + cat.slice(1)).join(', ') || 'No category';

      // Embed メッセージの作成
      const modEmbed = new EmbedBuilder()
      .setColor(0x1bd96a)
      .setAuthor({
        name: author,
        iconURL: authorIcon || null, // アイコンがない場合はnull
        url: authorUrl || '#', // URLがない場合は#をデフォルトに
      })
      .setTitle(modData.title || 'タイトルなし')
      .setURL(`https://modrinth.com/mod/${modData.id}`)
      .setThumbnail(modData.icon_url || '')
      .addFields(
        { name: '', value: modData.description || '概要なし' },
        { name: 'Loader', value: modData.loaders?.join(', ') || 'ローダーなし', inline: true },
        { name: 'Version', value: versionRange, inline: true },
        { name: 'Downloads', value: modData.downloads?.toLocaleString() || '0', inline: true },
      )
      .setFooter({ text: `Modrinth ${modData.project_type || 'Mod'}  |  ${category}` })
      .setTimestamp(new Date(modData.published));

      return interaction.followUp({ embeds: [modEmbed] });



    } catch (error) {
      console.error('エラー詳細:', error);
      return interaction.followUp({ content: 'MOD情報の取得中にエラーが発生しました。\nしばらく待ってからもう一度お試しください。', flags: MessageFlags.Ephemeral });
    }
  },
};
