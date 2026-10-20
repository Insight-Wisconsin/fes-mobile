import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  '(auth)': NavigatorScreenParams<AuthStackParamList>;
  '(app)': NavigatorScreenParams<AppStackParamList>;
  index: undefined;
  login: undefined;
  signup: undefined;
  home: undefined;
  calibration: undefined;
  RealTimeData: undefined;
  modal: undefined;
  _sitemap: undefined;
  explore: undefined;
};

export type AuthStackParamList = {
  login: undefined;
  signup: undefined;
};

export type AppStackParamList = {
  home: undefined;
  calibration: undefined;
  RealTimeData: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
