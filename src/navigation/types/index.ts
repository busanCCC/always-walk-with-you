// 네비게이션 타입 정의
export type AuthStackParamList = {
  Login: undefined;
};

export type MainTabParamList = {
  홈: undefined;
  영성일기: undefined;
  순: { showAddGroupModal?: boolean };
  마이페이지: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  ProfileSetup: undefined;
  Loading: undefined;
  WebView: { title: string; url: string };
  GroupDetail: {
    groupId: string;
    groupName: string;
  };
};
