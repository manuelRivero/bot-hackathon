import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { getBusinessInfo } from "@/lib/db/business";

const toJson = (value: unknown) => JSON.stringify(value);

export const getBusinessInfoTool = new DynamicStructuredTool({
  name: "get_business_info",
  description:
    "Devuelve la identidad del negocio: nombre, descripción, tipo de cocina, dirección, teléfono, horarios por día y redes sociales. Usala para saludos, presentaciones, o preguntas sobre horarios/ubicación/contacto.",
  schema: z.object({}),
  func: async () => {
    const info = await getBusinessInfo();
    return toJson({ business: info });
  },
});

export const businessTools = [getBusinessInfoTool];
