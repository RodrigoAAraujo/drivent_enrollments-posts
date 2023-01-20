import { badRequestError, invalidDataError } from "@/errors";
import { AxiosResponse } from "axios";
import { request } from "@/utils/request";

export async function validateCEP(cep: string): Promise<AxiosResponse>{
  const cepFormatted = cep.replace(/[^0-9]/gi, "");

  if (cepFormatted.length !== 8) throw invalidDataError(["CEP is not valid"])

  const CEPInfo = await request.get(`https://viacep.com.br/ws/${cepFormatted}/json/`) as AxiosResponse;

  return CEPInfo.data
}
