import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import theme from '@/constants/theme';
import { useCreateGroup } from '@/queries/groupQueries';
import GroupModal from './GroupModal';

interface AddGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const AddGroupModal: React.FC<AddGroupModalProps> = ({ visible, onClose, onSuccess }) => {
  const [groupName, setGroupName] = useState('');
  const [campus, setCampus] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createGroupMutation = useCreateGroup();

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError('순 이름을 입력해주세요.');
      return;
    }

    setError(null);

    try {
      await createGroupMutation.mutateAsync({
        name: groupName.trim(),
        description: description.trim(),
        campus: campus.trim() || undefined,
      });

      resetForm();
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      setError((err as Error).message || '순 생성 중 오류가 발생했습니다.');
    }
  };

  const resetForm = () => {
    setGroupName('');
    setCampus('');
    setDescription('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <GroupModal visible={visible} onClose={handleClose} title="새 순 만들기">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>순 이름</Text>
            <TextInput
              style={styles.input}
              placeholder="예) 인제대학교 캠퍼스 대순"
              value={groupName}
              onChangeText={setGroupName}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>순 설명</Text>
            <TextInput
              style={styles.input}
              placeholder="예) 인제대학교 순장 순원들 모임"
              value={description}
              onChangeText={setDescription}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>캠퍼스 (선택)</Text>
            <TextInput
              style={styles.input}
              placeholder="예) 인제대학교"
              value={campus}
              onChangeText={setCampus}
              autoCapitalize="none"
            />
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleClose}>
              <Text style={[styles.buttonText, styles.cancelButtonText]}>취소</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.createButton]}
              onPress={handleCreateGroup}
              disabled={createGroupMutation.isPending}>
              <Text style={styles.buttonText}>
                {createGroupMutation.isPending ? '생성 중...' : '만들기'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </GroupModal>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    marginBottom: theme.spacing[4],
  },
  inputLabel: {
    ...theme.fontStyles['sm-tight'],
    color: theme.colors['grey-03'],
    marginBottom: theme.spacing[2],
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors['light-grey-02'],
    borderRadius: 8,
    padding: theme.spacing[3],
    ...theme.fontStyles['base-normal'],
  },
  errorText: {
    ...theme.fontStyles['sm-tight'],
    color: 'red',
    marginBottom: theme.spacing[4],
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing[2],
  },
  button: {
    flex: 1,
    paddingVertical: theme.spacing[3],
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors['light-grey-02'],
    marginRight: theme.spacing[2],
  },
  createButton: {
    backgroundColor: theme.colors.primary.DEFAULT,
    marginLeft: theme.spacing[2],
  },
  buttonText: {
    ...theme.fontStyles['base-tight'],
    color: theme.colors.white,
  },
  cancelButtonText: {
    color: theme.colors['grey-03'],
  },
});

export default AddGroupModal;
