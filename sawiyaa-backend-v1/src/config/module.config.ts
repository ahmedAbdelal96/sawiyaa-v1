export default () => ({
  http: {
    enabled: process.env.CONFIG_HTTP_ENABLED ?? 'false',
    token: process.env.CONFIG_HTTP_TOKEN ?? '',
  },
});
