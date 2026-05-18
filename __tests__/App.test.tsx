import React from 'react';
import { render } from '@testing-library/react-native';
import { View, Text } from 'react-native';

describe('App Test Suite', () => {
  it('renders correctly', () => {
    const { getByText } = render(
      <View>
        <Text>Hello Healix</Text>
      </View>
    );
    expect(getByText('Hello Healix')).toBeTruthy();
  });
});
