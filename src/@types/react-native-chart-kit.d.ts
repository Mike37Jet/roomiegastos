declare module 'react-native-chart-kit' {
  import * as React from 'react';
  import { ViewStyle } from 'react-native';

  export type StackedBarChartProps = {
    data: {
      labels: string[];
      legend?: string[];
      data: number[][];
      barColors: string[];
    };
    width: number;
    height: number;
    style?: ViewStyle;
    withHorizontalLabels?: boolean;
    hideLegend?: boolean;
    chartConfig: {
      backgroundGradientFrom?: string;
      backgroundGradientTo?: string;
      color?: (opacity?: number) => string;
      labelColor?: (opacity?: number) => string;
      barPercentage?: number;
      decimalPlaces?: number;
    };
  };

  export const StackedBarChart: React.ComponentType<StackedBarChartProps>;
}
