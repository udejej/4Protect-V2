const db = require('../../Events/loadDatabase');
const config = require('../../config.json');

exports.help = {
  name: 'soutien',
  sname: 'soutien <clear/@role/id> <texte>',
  description: "Gère le soutien",
  use: 'soutien <clear/@role/id> <texte>',
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

  const roleArg = args[0];

  if (roleArg && roleArg.toLowerCase() === 'clear') {
    db.run('DELETE FROM soutien WHERE guild = ?', [message.guild.id], (err) => {
      if (err) return message.reply("Une erreur est survenue lors du clear.");
      return message.reply("La configuration du soutien a été supprimée.");
    });
    return;
  }

  const text = args.slice(1).join(" ");
  let role = null;

  if (message.mentions.roles.size > 0) {
    role = message.mentions.roles.first();
  } else if (roleArg && message.guild.roles.cache.get(roleArg)) {
    role = message.guild.roles.cache.get(roleArg);
  }

  if (!role || !text) {
    return message.reply("Use: soutien <@role/id> <texte>");
  }

  db.run(
    `CREATE TABLE IF NOT EXISTS soutien (guild TEXT PRIMARY KEY, id TEXT, texte TEXT)`,
    [],
    (err) => {
      if (err) return message.reply("Une erreur est survenue.");
      db.run(
        `INSERT OR REPLACE INTO soutien (guild, id, texte) VALUES (?, ?, ?)`,
        [message.guild.id, role.id, text],
        (err) => {
          if (err) return message.reply("Une erreur est survenue.");
          message.reply(`Rôle soutien ${role} - Texte: ${text}`);
        }
      );
    }
  );
};