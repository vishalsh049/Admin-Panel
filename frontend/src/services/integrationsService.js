import api from "./api";

export async function getIntegrations() {
  const { data } = await api.get("/api/admin/integrations");
  return data;
}

export async function getIntegrationConfig(providerCode) {
  const { data } = await api.get(`/api/admin/integrations/${providerCode}`);
  return data;
}

export async function saveIntegrationConfig(providerCode, payload) {
  const { data } = await api.put(`/api/admin/integrations/${providerCode}`, payload);
  return data;
}

export async function testIntegrationConnection(providerCode, payload) {
  const { data } = await api.post(`/api/admin/integrations/${providerCode}/test`, payload || {});
  return data;
}

export async function toggleIntegration(providerCode, enabled) {
  const { data } = await api.post(`/api/admin/integrations/${providerCode}/${enabled ? "enable" : "disable"}`);
  return data;
}
