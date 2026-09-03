import { onRequestDelete as __api_products__id__js_onRequestDelete } from "C:\\Users\\juanp\\.gemini\\antigravity\\scratch\\sistema_pos\\functions\\api\\products\\[id].js"
import { onRequestPut as __api_products__id__js_onRequestPut } from "C:\\Users\\juanp\\.gemini\\antigravity\\scratch\\sistema_pos\\functions\\api\\products\\[id].js"
import { onRequestGet as __api_dashboard_js_onRequestGet } from "C:\\Users\\juanp\\.gemini\\antigravity\\scratch\\sistema_pos\\functions\\api\\dashboard.js"
import { onRequestGet as __api_products_js_onRequestGet } from "C:\\Users\\juanp\\.gemini\\antigravity\\scratch\\sistema_pos\\functions\\api\\products.js"
import { onRequestPost as __api_products_js_onRequestPost } from "C:\\Users\\juanp\\.gemini\\antigravity\\scratch\\sistema_pos\\functions\\api\\products.js"
import { onRequestPost as __api_sales_js_onRequestPost } from "C:\\Users\\juanp\\.gemini\\antigravity\\scratch\\sistema_pos\\functions\\api\\sales.js"

export const routes = [
    {
      routePath: "/api/products/:id",
      mountPath: "/api/products",
      method: "DELETE",
      middlewares: [],
      modules: [__api_products__id__js_onRequestDelete],
    },
  {
      routePath: "/api/products/:id",
      mountPath: "/api/products",
      method: "PUT",
      middlewares: [],
      modules: [__api_products__id__js_onRequestPut],
    },
  {
      routePath: "/api/dashboard",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_dashboard_js_onRequestGet],
    },
  {
      routePath: "/api/products",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_products_js_onRequestGet],
    },
  {
      routePath: "/api/products",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_products_js_onRequestPost],
    },
  {
      routePath: "/api/sales",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_sales_js_onRequestPost],
    },
  ]