import axios from "axios";

export const api = axios.create({
  baseURL: "/api/v1",
  timeout: 60_000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const detail = err?.response?.data?.detail ?? err.message;
    return Promise.reject(new Error(typeof detail === "string" ? detail : JSON.stringify(detail)));
  }
);