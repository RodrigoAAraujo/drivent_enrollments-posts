import { request } from "@/utils/request";
import { badRequestError, invalidDataError, notFoundError, requestError } from "@/errors";
import addressRepository, { CreateAddressParams } from "@/repositories/address-repository";
import enrollmentRepository, { CreateEnrollmentParams } from "@/repositories/enrollment-repository";
import { exclude } from "@/utils/prisma-utils";
import { Address, Enrollment } from "@prisma/client";
import { ViaCEPAddress } from "@/protocols";
import axios, {  Axios, AxiosResponse } from "axios";
import { boolean, Err } from "joi";
import { validateCEP } from "@/middlewares/CEPverification";

async function getAddressFromCEP(cep : string): Promise<CEPInformation> {
  const {data}= await request.get(`https://viacep.com.br/ws/${cep}/json/`) as AxiosResponse<ViaCEPAddress>;

  if (!data) {
    throw notFoundError();
  }

  const CEPInfo ={
    logradouro: data.logradouro, 
    complemento: data.complemento, 
    bairro: data.bairro, 
    cidade: data.localidade, 
    uf: data.uf
  }
  
  return CEPInfo
}

type CEPInformation = Partial<ViaCEPAddress>

async function getOneWithAddressByUserId(userId: number): Promise<GetOneWithAddressByUserIdResult> {
  const enrollmentWithAddress = await enrollmentRepository.findWithAddressByUserId(userId);

  if (!enrollmentWithAddress) throw notFoundError();

  const [firstAddress] = enrollmentWithAddress.Address;
  const address = getFirstAddress(firstAddress);

  return {
    ...exclude(enrollmentWithAddress, "userId", "createdAt", "updatedAt", "Address"),
    ...(!!address && { address }),
  };
}

type GetOneWithAddressByUserIdResult = Omit<Enrollment, "userId" | "createdAt" | "updatedAt">;

function getFirstAddress(firstAddress: Address): GetAddressResult {
  if (!firstAddress) return null;

  return exclude(firstAddress, "createdAt", "updatedAt", "enrollmentId");
}

type GetAddressResult = Omit<Address, "createdAt" | "updatedAt" | "enrollmentId">;

async function createOrUpdateEnrollmentWithAddress(params: CreateOrUpdateEnrollmentWithAddress) {
  const enrollment = exclude(params, "address");
  const address = getAddressForUpsert(params.address);

  const CEPInfo = await validateCEP(params.address.cep) as ErrorCheck

  if(CEPInfo.erro){
    throw badRequestError("CEP invalid")
  }   
  
  const newEnrollment = await enrollmentRepository.upsert(params.userId, enrollment, exclude(enrollment, "userId"));

  await addressRepository.upsert(newEnrollment.id, address, address);
}

type ErrorCheck = { erro?: boolean}

function getAddressForUpsert(address: CreateAddressParams) {
  return {
    ...address,
    ...(address?.addressDetail && { addressDetail: address.addressDetail }),
  };
}

export type CreateOrUpdateEnrollmentWithAddress = CreateEnrollmentParams & {
  address: CreateAddressParams;
};



const enrollmentsService = {
  getOneWithAddressByUserId,
  createOrUpdateEnrollmentWithAddress,
  getAddressFromCEP,
};

export default enrollmentsService;
