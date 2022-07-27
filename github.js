const { Octokit } = require("octokit");

// Create a personal access token at https://github.com/settings/tokens/new?scopes=repo
const octokit = new Octokit({ auth: process.env.GITHUB_ACCESS_TOKEN });

const atCapacityEmojis = [":red_circle:", ":palm_tree:"];

async function generateDiscordMessage() {
  const reviews = await getReviewRequests();

  const reviewText = Object.entries(reviews)
    .sort((a, b) => {
      if (
        atCapacityEmojis.some((e) => a[0].includes(e)) &&
        !atCapacityEmojis.some((e) => b[0].includes(e))
      ) {
        return 1;
      }
      if (
        !atCapacityEmojis.some((e) => a[0].includes(e)) &&
        atCapacityEmojis.some((e) => b[0].includes(e))
      ) {
        return -1;
      }

      if (a[1] > b[1]) {
        return 1;
      }
      if (a[1] < b[1]) {
        return -1;
      }
      return 0;
    })
    .map(([login, count]) => {
      return `${login} - \`${count}\``;
    })
    .join("\n");

  return reviewText;
}

async function getReviewRequests() {
  const { data: pulls } = await octokit.rest.pulls.list({
    owner: "jbx-protocol",
    repo: "juice-interface",
    state: "open",
  });

  const data = await octokit.graphql(
    `
    query teamMembers($org: String!, $team_slug: String!) {
      organization(login: $org) {
        team(slug: $team_slug) {
            members {
                nodes {
                  login
                  status {
                    emoji
                  }
                }
              }
        }
      }
    }
  `,
    {
      org: "jbx-protocol",
      team_slug: "frontend-core",
    }
  );

  const teamMembers = data.organization.team.members.nodes;

  const reviewLoad = pulls
    .flatMap((p) => p.requested_reviewers.flatMap((user) => user.login))
    .reduce(
      (obj, login) => {
        if (obj[login] === undefined) {
          obj[login] = 1;
        } else {
          obj[login] += 1;
        }

        return obj;
      },
      teamMembers
        .flatMap((u) => u.login)
        .reduce((a, b) => {
          a[b] = 0;
          return a;
        }, {})
    );

  const withStatus = Object.entries(reviewLoad).reduce(
    (obj, [login, count]) => {
      const emoji = teamMembers.find((m) => m.login === login)?.status?.emoji;

      const emojiText = atCapacityEmojis.includes(emoji) ? ` ${emoji}` : "";

      const name = `${login}${emojiText}`;
      obj[name] = count;

      return obj;
    },
    {}
  );

  return withStatus;
}

module.exports = {
  getReviewRequests,
  generateDiscordMessage,
};
