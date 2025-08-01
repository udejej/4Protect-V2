const { PermissionsBitField } = require('discord.js');
const config = require('../../config.json');

exports.help = {
  name: 'emoji',
  sname: 'emoji <emoji>',
  description: "Copie un emoji",
  use: 'emoji <emoji>',
};

exports.run = async (bot, message, args, config) => {
  const configcheck = async (message, commandName) => {
    if (config.owners.includes(message.author.id)) {
      return true;
    }

const publicOn = await new Promise((resolve, reject) => {
  db.get('SELECT statut FROM public WHERE guild = ? AND statut = ?', [message.guild.id, 'on'], (err, row) => {
    if (err) reject(err);
    resolve(!!row);
  });
});

if (publicOn) {

  const publicCheck = await new Promise((resolve, reject) => {
    db.get(
      'SELECT command FROM cmdperm WHERE perm = ? AND command = ? AND guild = ?',
      ['public', commandName, message.guild.id],
      (err, row) => {
        if (err) reject(err);
        resolve(!!row);
      }
    );
  });

  if (publicCheck) {
    return true;
  }
}
    
    try {
      const wldb = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM whitelist WHERE id = ?', [message.author.id], (err, row) => {
          if (err) reject(err);
          resolve(!!row);
        });
      });

      if (wldb) {
        return true;
      }

            const ownerdb = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM owner WHERE id = ?', [message.author.id], (err, row) => {
          if (err) reject(err);
          resolve(!!row);
        });
      });

      if (ownerdb) {
        return true;
      }

      const roles = message.member.roles.cache.map(role => role.id);
      const permissions = await new Promise((resolve, reject) => {
        db.all('SELECT perm FROM permissions WHERE id IN (' + roles.map(() => '?').join(',') + ') AND guild = ?', [...roles, message.guild.id], (err, rows) => {
          if (err) reject(err);
          resolve(rows.map(row => row.perm));
        });
      });

      if (permissions.length === 0) {
        return false;
      }

      const cmdwl = await new Promise((resolve, reject) => {
        db.all('SELECT command FROM cmdperm WHERE perm IN (' + permissions.map(() => '?').join(',') + ') AND guild = ?', [...permissions, message.guild.id], (err, rows) => {
          if (err) reject(err);
          resolve(rows.map(row => row.command));
        });
      });

      return cmdwl.includes(commandName);
    } catch (error) {
      console.error('Erreur lors de la vérification des permissions:', error);
      return false;
    }
  };

  if (!(await configcheck(message, exports.help.name))) {
    const noacces = new EmbedBuilder()
    .setDescription("Vous n'avez pas la permission d'utiliser cette commande.")
    .setColor(config.color);
  return message.reply({embeds: [noacces], allowedMentions: { repliedUser: true }});
  }

  const emj = args[0].match(/<(a)?:([a-zA-Z0-9_]+):(\d+)>/);
  if (emj) {
    const animated = Boolean(emj[1]);
    const name = emj[2];
    const id = emj[3];
    const url = `https://cdn.discordapp.com/emojis/${id}.${animated ? 'gif' : 'png'}?v=1`;
    try {
      const emoji = await message.guild.emojis.create({ name, attachment: url });
      return message.reply(`Emoji ajouté : <${animated ? 'a' : ''}:${name}:${emoji.id}>`);
    } catch (e) {
      return message.reply("Impossible d'ajouter l'emoji : " + (e.message || e));
    }
  }
};
