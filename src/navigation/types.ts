import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  VerifyPending: { email: string };
  Home: undefined;
  Profile: undefined;
  EditProfile: { autoFocusTaxId?: boolean } | undefined;
  TaxRegistration: undefined;
  ProofDocuments:
    | {
        groupIndex?: number;
        dependentId?: string;
        dependentData?: {
          fullName: string;
          citizenId?: string;
          birthCertNumber?: string;
          dateOfBirth: string;
          relationship: string;
          effectiveFromMonth: string;
          effectiveToMonth?: string;
          groupId: number;
          groupCode: string;
        };
      }
    | undefined;
  IncomeSourceList: undefined;
  ChangePassword: undefined;
  LawConditions: undefined;
  DependentList: undefined;
};

export type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;
