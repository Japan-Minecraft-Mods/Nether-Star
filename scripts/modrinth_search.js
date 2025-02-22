// キャッシュの設定
const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1時間
const RATE_LIMIT_INTERVAL = 1000; // 1リクエストごとに2秒間隔（分間30回以下）
let lastRequestTime = 0;

// レート制限付きの fetch 関数
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

// ModrinthのMOD情報を検索して返す関数
async function searchMod(query) {
  const modIdPattern = /^[A-Za-z0-9]{8}$/;
  let modId = query;

  if (!modIdPattern.test(modId)) {
    const urlMatch = query.match(/modrinth\.com\/mod\/([^\/]+)/);
    if (urlMatch) {
      modId = urlMatch[1];
    } else {
      try {
        const searchData = await fetchWithRateLimit(
          `https://api.modrinth.com/v2/search?query=${encodeURIComponent(query)}&index=downloads&limit=10`
        );
        if (searchData.hits.length === 0) {
          throw new Error('該当するMODが見つかりませんでした。');
        }
        modId = searchData.hits[0].project_id;
      } catch (error) {
        throw new Error('MODの検索に失敗しました。\n しばらく待ってからもう一度お試しください。');
      }
    }
  }

  return modId;
}

// MODの詳細情報を取得する関数
async function fetchModInfo(modId) {
  try {
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

    return { modData, versionRange, author, authorIcon, authorUrl, category };
  } catch (error) {
    throw new Error(`MOD情報の取得中にエラーが発生しました: ${error.message}`);
  }
}

module.exports = { searchMod, fetchModInfo, fetchWithRateLimit };
