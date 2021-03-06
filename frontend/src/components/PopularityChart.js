/**
 * Creates the chart that is displayed on the `SymbolDetails` page that compares the
 * popularity to the price of an asset over time.
 */

import React, { Fragment } from 'react';
import ReactEchartsCore from 'echarts-for-react/lib/core';
import echarts from 'echarts/lib/echarts';
import 'echarts/lib/chart/line';
import 'echarts/lib/component/tooltip';
import 'echarts/lib/component/legend';
import 'echarts/lib/component/dataZoom';
import * as R from 'ramda';

import { emphasis, emphasis2 } from 'src/style';
import { withMobileProp } from 'src/components/ResponsiveHelpers';
import MobileZoomHandle from 'src/components/MobileZoomHandle';

const styles = {
  root: {},
  mobileHint: {
    textAlign: 'center',
    fontSize: 10,
    color: '#666',
    paddingTop: 5,
  },
};
const MS_PER_DAY = 86400000;

/**
 * Computes stats about the provided time series used to calculate its display parameters.  Mainly,
 * the goal is to clamp the axes to minize space above and below the series.
 *
 * @param {[][]} series
 * @param {number} zoomStart A number representing the starting point of the currently zoomed
 *  region as a percent from 0 to 100.
 * @param {number} zoomEnd A number representing the ending point of the currently zoomed region as
 *  a percent from 0 to 100.
 */
const analyzeTimeSeries = (series, zoomStart, zoomEnd) => {
  const first = series[0] || [new Date('3000-04-20'), 0];
  const last = R.last(series) || [new Date('1900-04-20'), 0];

  // We limit the series to only include data points that are active in the currently displayed
  // zoom region
  const timeRangeMs = last[0] - first[0];
  const windowPadding = Math.abs(MS_PER_DAY / timeRangeMs) * 100;

  const zoomStartDate = new Date(
    first[0].getTime() + (Math.max(zoomStart - windowPadding, 0) * timeRangeMs) / 100
  );
  const zoomEndDate = new Date(
    first[0].getTime() + (Math.min(zoomEnd + windowPadding, 100) * timeRangeMs) / 100
  );
  console.log({ series, zoomStartDate, zoomEndDate, zoomStart, zoomEnd, timeRangeMs });

  const values = (series.length > 0
    ? series.filter(([date]) => date >= zoomStartDate && date <= zoomEndDate)
    : series
  ).map(arr => arr[1]);

  const min = values.reduce(R.min, values[0] || 0);
  const max = values.reduce(R.max, values[0] || 0);

  console.log({ min, max, series, values });

  const offset = 0.05 * (max - min);

  return [min, max, first, last, offset];
};

const splitLineOptions = {
  lineStyle: { color: '#323232' },
};

const getXAxisOptions = ({ mobile, firstPopularity, lastPopularity, firstQuote, lastQuote }) => ({
  type: 'time',
  splitNumber: mobile ? 7 : 20,
  axisLabel: {
    color: 'white',
    showMinLabel: false,
    showMaxLabel: false,
    formatter: (value, index) => {
      // Formatted to be month/day; display year only in the first label
      const date = new Date(value);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    },
  },
  axisPointer: { snap: false },
  min: R.minBy(R.head, firstPopularity, firstQuote)[0],
  max: R.maxBy(R.head, lastPopularity, lastQuote)[0],
  splitLine: splitLineOptions,
});

const seriesDefaults = {
  symbol: 'circle',
  showSymbol: false,
  type: 'line',
  smooth: false,
  animation: false,
};

const getYAxisDefaults = mobile => ({
  type: 'value',
  ...(mobile
    ? { axisLabel: { show: false }, axisTick: { show: false } }
    : {
        axisLabel: {
          showMinLabel: false,
          showMaxLabel: false,
          color: 'white',
        },
      }),
  splitNumber: mobile ? 7 : 10,
  splitLine: splitLineOptions,
});

const getBaseConfigDefaults = mobile => ({
  backgroundColor: '#1d2126',
  legend: { show: true, textStyle: { color: '#fff' } },
  grid: {
    bottom: 75,
    top: mobile ? 25 : 75,
    left: mobile ? 17 : 75,
    right: mobile ? 13 : 75,
  },
  tooltip: { trigger: 'axis' },
  dataZoom: [
    {
      type: 'slider',
      show: true,
      xAxisIndex: [0, 1],
      showDetail: true,
      fillerColor: '#2d2f33',
      bottom: 5,
      textStyle: { color: '#fff' },
      filterMode: 'none',
      realtime: false,
      ...(mobile ? { handleIcon: MobileZoomHandle, handleSize: '80%' } : {}),
    },
  ],
  animation: true,
});

const getChartOptions = ({
  symbol,
  quoteHistory = [],
  popularityHistory = [],
  zoomStart,
  zoomEnd,
  mobile,
}) => {
  const quoteSeries = quoteHistory.map(({ timestamp, last_trade_price: lastTradePrice }) => [
    new Date(timestamp),
    lastTradePrice,
  ]);
  const popularitySeries = popularityHistory.map(({ timestamp, popularity }) => [
    new Date(timestamp),
    popularity,
  ]);

  const [minQuote, maxQuote, firstQuote, lastQuote, quoteOffset] = analyzeTimeSeries(
    quoteSeries,
    zoomStart,
    zoomEnd
  );
  const [
    minPopularity,
    maxPopularity,
    firstPopularity,
    lastPopularity,
    popularityOffset,
  ] = analyzeTimeSeries(popularitySeries, zoomStart, zoomEnd);

  const xAxisOptions = getXAxisOptions({
    mobile,
    firstPopularity,
    lastPopularity,
    firstQuote,
    lastQuote,
  });
  const yAxisDefaults = getYAxisDefaults(mobile);

  return {
    ...getBaseConfigDefaults(mobile),
    title: { text: `Popularity History for ${symbol}` },
    xAxis: [
      xAxisOptions,
      {
        ...xAxisOptions,
        show: false,
        axisPointer: { lineStyle: { color: 'transparent' } },
      },
    ],
    yAxis: [
      {
        ...yAxisDefaults,
        min: minQuote - quoteOffset,
        max: maxQuote + quoteOffset,
        axisLabel: {
          show: !mobile,
          ...yAxisDefaults.axisLabel,
          formatter: value => `$${value.toFixed(2)}`,
        },
        splitLine: { ...yAxisDefaults.splitLine, show: true },
      },
      {
        ...yAxisDefaults,
        min: minPopularity - popularityOffset,
        max: maxPopularity + popularityOffset,
        splitLine: { ...yAxisDefaults.axisLabel, show: false },
        minInterval: 1,
      },
    ],
    series: [
      {
        ...seriesDefaults,
        name: 'Price',
        data: quoteSeries.map(([timestamp, quote]) => [timestamp, parseFloat(quote.toFixed(3))]),
        yAxisIndex: 0,
        xAxisIndex: 0,
        lineStyle: { color: emphasis },
        itemStyle: { color: emphasis, borderColor: '#fff' },
      },
      {
        ...seriesDefaults,
        name: '# Users Holding',
        data: popularitySeries,
        yAxisIndex: 1,
        xAxisIndex: 1,
        lineStyle: { color: emphasis2 },
        itemStyle: { color: emphasis2, borderColor: '#fff' },
      },
    ],
  };
};

const getViewportHeight = () =>
  Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

const BasePopularityChart = ({ mobile, style, options, ...props }) => {
  const viewportHeight = getViewportHeight();
  const height = (mobile ? 0.5 : 0.7) * viewportHeight;
  const mergedStyle = {
    height,
    ...(mobile ? { marginLeft: -15, marginRight: -15 } : {}),
    ...style,
  };

  return (
    <ReactEchartsCore
      option={options}
      echarts={echarts}
      notMerge={true}
      lazyUpdate={false}
      opts={{}}
      style={mergedStyle}
      {...props}
    />
  );
};

const PopularityChart = ({ style, ...props }) => {
  const handleDataZoom = ({ start, end }, instance) =>
    instance.setOption(getChartOptions({ ...props, zoomStart: start, zoomEnd: end }));

  return (
    <Fragment>
      <BasePopularityChart
        options={getChartOptions({ ...props, zoomStart: 0, zoomEnd: 100 })}
        onEvents={{ datazoom: handleDataZoom }}
        {...props}
      />

      {props.mobile ? (
        <center style={styles.mobileHint}>Touch the chart to view price + popularity values</center>
      ) : null}
    </Fragment>
  );
};

export default withMobileProp({ maxDeviceWidth: 600 })(PopularityChart);
