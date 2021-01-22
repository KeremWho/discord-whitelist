const axios = require('axios').default;
const config = require('./config.json')
const { getError } = require('./errors');

axios.defaults.baseURL = 'https://discord.com/api/v8';

axios.defaults.headers = {
  Authorization: `Bot ${config.application.token}`,
  'Content-Type': 'application/json'
};

axios.interceptors.response.use((res) => (res), (err) => {
  if (err.response.status !== 404)
    console.log(`\n^1[discord-whitelist] Discord API erişim isteği başarısız oldu.\n  • ${getError(err)}^7\n`);
  return Promise.reject(err);
});

async function validateToken() {
  const res = await axios('/users/@me');
  if (res.data.id) {
    console.log(`\n^2[discord-whitelist] Token doğrulandı.\n  ^7• Giriş Yapılan Hesap: ^6${res.data.username}#${res.data.discriminator} (${res.data.id})^7\n`);
    canRun = true;
  }
};

function getUserDiscord(user) {
  if (typeof user === 'string') return user;
  if (!GetPlayerName(user)) return false;
  for (let idIndex = 0; idIndex <= GetNumPlayerIdentifiers(user); idIndex ++) {
    if (GetPlayerIdentifier(user, idIndex).indexOf('discord:') !== -1) return GetPlayerIdentifier(user, idIndex).replace('discord:', '');
  }
  return false;
}

exports('isRolePresent', (user, role, ...args) => {
  if (!canRun) return console.log('^1[discord-whitelist] Giriş başarısız, sistem çalışmayacak.^7');
  const isArgGuild = typeof args[0] === 'string';
  const selectedGuild = isArgGuild ? args[0] : config.discordData.guild;
  const discordUser = getUserDiscord(user); 
  if (!discordUser) return isArgGuild ? args[1](false) : args[0](false);
  axios(`/guilds/${selectedGuild}/members/${discordUser}`).then((res) => {
    const hasRole = typeof role === 'string' ? res.data.roles.includes(role) : res.data.roles.some((curRole, index) => res.data.roles.includes(role[index]));
    isArgGuild ? args[1](hasRole, res.data.roles) : args[0](hasRole, res.data.roles);
  }).catch((err) => {
    if (err.response.status === 404) {
      isArgGuild ? args[1](false) : args[0](false);
    }
  });
});

exports('getUserRoles', (user, ...args) => {
  if (!canRun) return console.log('^1[discord-whitelist] Giriş başarısız, sistem çalışmayacak.^7');
  const isArgGuild = typeof args[0] === 'string';
  const selectedGuild = isArgGuild ? args[0] : config.discordData.guild;
  const discordUser = getUserDiscord(user); 
  if (!discordUser) return isArgGuild ? args[1](false) : args[0](false);
  axios(`/guilds/${selectedGuild}/members/${discordUser}`).then((res) => {
    isArgGuild ? args[1](res.data.roles) : args[0](res.data.roles);
  }).catch((err) => {
    if (err.response.status === 404) {
      isArgGuild ? args[1](false) : args[0](false);
    }
  });
});

exports('getUserData', (user, ...args) => {
  if (!canRun) return console.log('^1[discord-whitelist] Giriş başarısız, sistem çalışmayacak.^7');
  const isArgGuild = typeof args[0] === 'string';
  const selectedGuild = isArgGuild ? args[0] : config.discordData.guild;
  const discordUser = getUserDiscord(user); 
  if (!discordUser) return isArgGuild ? args[1](false) : args[0](false);
  axios(`/guilds/${selectedGuild}/members/${discordUser}`).then((res) => {
    isArgGuild ? args[1](res.data) : args[0](res.data);
  }).catch((err) => {
    if (err.response.status === 404) {
      isArgGuild ? args[1](false) : args[0](false);
    }
  });
});

validateToken();

on('playerConnecting', (name, setKickReason, deferrals) => {
  let src = global.source;
  deferrals.defer()

  setTimeout(() => {
      deferrals.update(`Merhaba ${name}. Lütfen bekle whitelist kontrolü yapılıyor.`)

      let identifierDiscord = null;

      for (let i = 0; i < GetNumPlayerIdentifiers(src); i++) {
          const identifier = GetPlayerIdentifier(src, i);

          if (identifier.includes('discord:')) {
              identifierDiscord = identifier;
          }
      }
      setTimeout(() => {
          if(identifierDiscord) {
              exports['discord-whitelist']['isRolePresent'](src, config.roles.blacklistRoles, function(hasRole, roles) {
                  if(hasRole) {
                      deferrals.done(config.messages.blacklistMessage);
                  }
              })
              exports['discord-whitelist']['isRolePresent'](src, config.roles.whitelistRoles, function(hasRole, roles) {
                  if(!roles) {
                      deferrals.done(config.messages.noGuildMessage)
                  }
                  if(hasRole) {
                      deferrals.done()
                  } else {
                      deferrals.done(config.messages.notWhitelistedMessage)
                  }
              })
          } else {
              deferrals.done(`Discord tespit edilmedi. Giriş yapmak için Discord'a giriş yapın.`)
          }
      }, 0)
  }, 0)
})