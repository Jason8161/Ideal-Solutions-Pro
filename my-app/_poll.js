const JsonFile = require("@expo/json-file").default || require("@expo/json-file");
const { SubmissionQuery } = require("eas-cli/build/graphql/queries/SubmissionQuery");
const { createGraphqlClient } = require("eas-cli/build/commandUtils/context/contextUtils/createGraphqlClient");
const { getStateJsonPath } = require("eas-cli/build/utils/paths");
const auth = JsonFile.read(getStateJsonPath())?.auth;
const client = createGraphqlClient({ sessionSecret: auth.sessionSecret });
(async () => {
  const s = await SubmissionQuery.byIdAsync(client, "7f2ddfd9-ded5-4a5e-9ee1-77e2184e7302", { useCache: false });
  console.log("in progress sub", s.status, s.error);
})();
