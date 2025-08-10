"""
Statistical Analysis Tool

This tool provides functionality to perform statistical analysis on datasets.
It supports descriptive statistics, hypothesis testing, regression analysis, and more.
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Union
import pandas as pd
import numpy as np
from scipy import stats
from scipy.stats import ttest_ind, chi2_contingency, pearsonr, spearmanr
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import mean_squared_error, r2_score, accuracy_score, classification_report
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')

from .base import BaseTool

logger = logging.getLogger(__name__)

class StatisticalAnalysisTool(BaseTool):
    """
    Tool for performing statistical analysis on datasets.
    
    Features:
    - Descriptive statistics
    - Hypothesis testing (t-tests, chi-square, etc.)
    - Correlation analysis
    - Regression analysis
    - Distribution fitting
    - Outlier detection
    - Statistical tests for normality
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.name = "Statistical Analysis"
        self.description = "Perform statistical analysis on datasets"
        self.category = "Analytics"
        self.tool_type = "Function"
        
        # Configuration
        self.confidence_level = config.get('confidence_level', 0.95)
        self.significance_level = config.get('significance_level', 0.05)
        self.max_sample_size = config.get('max_sample_size', 10000)
        
    async def execute(self, **kwargs) -> Dict[str, Any]:
        """
        Execute statistical analysis operation with given parameters.
        
        Args:
            action: Operation to perform (descriptive, hypothesis_test, correlation, etc.)
            data: Data to analyze
            columns: Columns to analyze
            test_type: Type of statistical test
            group_column: Column for grouping data
            target_column: Target variable for regression
            feature_columns: Feature variables for regression
            
        Returns:
            Dictionary containing analysis result
        """
        action = kwargs.get('action', 'descriptive')
        
        try:
            if action == 'descriptive':
                return await self._descriptive_statistics(kwargs)
            elif action == 'hypothesis_test':
                return await self._hypothesis_test(kwargs)
            elif action == 'correlation':
                return await self._correlation_analysis(kwargs)
            elif action == 'regression':
                return await self._regression_analysis(kwargs)
            elif action == 'distribution_test':
                return await self._distribution_test(kwargs)
            elif action == 'outlier_detection':
                return await self._outlier_detection(kwargs)
            elif action == 'anova':
                return await self._anova_analysis(kwargs)
            elif action == 'chi_square':
                return await self._chi_square_test(kwargs)
            elif action == 'normality_test':
                return await self._normality_test(kwargs)
            else:
                return self._format_error(f"Unknown action: {action}")
                
        except Exception as e:
            logger.error(f"Error in statistical analysis: {str(e)}")
            return self._format_error(f"Statistical analysis failed: {str(e)}")
    
    async def _descriptive_statistics(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate descriptive statistics for data."""
        data = params.get('data', [])
        columns = params.get('columns', [])
        
        if not data:
            return self._format_error("Data is required")
        
        try:
            df = pd.DataFrame(data)
            
            # Select columns to analyze
            if columns:
                df = df[columns]
            
            # Get numerical columns
            numerical_cols = df.select_dtypes(include=[np.number]).columns
            
            if len(numerical_cols) == 0:
                return self._format_error("No numerical columns found for analysis")
            
            results = {}
            
            for col in numerical_cols:
                series = df[col].dropna()
                
                if len(series) == 0:
                    results[col] = {'error': 'No valid data'}
                    continue
                
                # Basic statistics
                basic_stats = {
                    'count': len(series),
                    'mean': float(series.mean()),
                    'median': float(series.median()),
                    'std': float(series.std()),
                    'variance': float(series.var()),
                    'min': float(series.min()),
                    'max': float(series.max()),
                    'range': float(series.max() - series.min()),
                    'q1': float(series.quantile(0.25)),
                    'q3': float(series.quantile(0.75)),
                    'iqr': float(series.quantile(0.75) - series.quantile(0.25)),
                    'skewness': float(series.skew()),
                    'kurtosis': float(series.kurtosis())
                }
                
                # Percentiles
                percentiles = [1, 5, 10, 25, 50, 75, 90, 95, 99]
                percentile_values = {}
                for p in percentiles:
                    percentile_values[f'p{p}'] = float(series.quantile(p/100))
                
                basic_stats['percentiles'] = percentile_values
                
                # Missing values
                basic_stats['missing_count'] = int(df[col].isnull().sum())
                basic_stats['missing_percentage'] = float(df[col].isnull().sum() / len(df) * 100)
                
                results[col] = basic_stats
            
            return self._format_success({
                'descriptive_statistics': results,
                'columns_analyzed': list(numerical_cols),
                'total_columns': len(numerical_cols)
            })
            
        except Exception as e:
            return self._format_error(f"Error calculating descriptive statistics: {str(e)}")
    
    async def _hypothesis_test(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Perform hypothesis testing."""
        data = params.get('data', [])
        test_type = params.get('test_type', 't_test')
        column1 = params.get('column1', '')
        column2 = params.get('column2', '')
        group_column = params.get('group_column', '')
        value_column = params.get('value_column', '')
        alpha = params.get('alpha', self.significance_level)
        
        if not data:
            return self._format_error("Data is required")
        
        try:
            df = pd.DataFrame(data)
            
            if test_type == 't_test_independent':
                # Independent t-test
                if not column1 or not column2:
                    return self._format_error("Two columns required for independent t-test")
                
                if column1 not in df.columns or column2 not in df.columns:
                    return self._format_error("Specified columns not found")
                
                group1 = df[column1].dropna()
                group2 = df[column2].dropna()
                
                if len(group1) < 2 or len(group2) < 2:
                    return self._format_error("Insufficient data for t-test")
                
                statistic, p_value = ttest_ind(group1, group2)
                
                result = {
                    'test_type': 'Independent t-test',
                    'statistic': float(statistic),
                    'p_value': float(p_value),
                    'significant': p_value < alpha,
                    'alpha': alpha,
                    'group1_mean': float(group1.mean()),
                    'group2_mean': float(group2.mean()),
                    'group1_std': float(group1.std()),
                    'group2_std': float(group2.std()),
                    'group1_size': len(group1),
                    'group2_size': len(group2)
                }
                
            elif test_type == 't_test_paired':
                # Paired t-test
                if not column1 or not column2:
                    return self._format_error("Two columns required for paired t-test")
                
                if column1 not in df.columns or column2 not in df.columns:
                    return self._format_error("Specified columns not found")
                
                # Remove rows where either column has missing values
                valid_data = df[[column1, column2]].dropna()
                
                if len(valid_data) < 2:
                    return self._format_error("Insufficient data for paired t-test")
                
                statistic, p_value = stats.ttest_rel(valid_data[column1], valid_data[column2])
                
                result = {
                    'test_type': 'Paired t-test',
                    'statistic': float(statistic),
                    'p_value': float(p_value),
                    'significant': p_value < alpha,
                    'alpha': alpha,
                    'mean_difference': float((valid_data[column1] - valid_data[column2]).mean()),
                    'std_difference': float((valid_data[column1] - valid_data[column2]).std()),
                    'sample_size': len(valid_data)
                }
                
            elif test_type == 'one_sample_t_test':
                # One-sample t-test
                if not column1:
                    return self._format_error("Column required for one-sample t-test")
                
                if column1 not in df.columns:
                    return self._format_error("Specified column not found")
                
                test_value = params.get('test_value', 0)
                sample = df[column1].dropna()
                
                if len(sample) < 2:
                    return self._format_error("Insufficient data for one-sample t-test")
                
                statistic, p_value = stats.ttest_1samp(sample, test_value)
                
                result = {
                    'test_type': 'One-sample t-test',
                    'statistic': float(statistic),
                    'p_value': float(p_value),
                    'significant': p_value < alpha,
                    'alpha': alpha,
                    'test_value': test_value,
                    'sample_mean': float(sample.mean()),
                    'sample_std': float(sample.std()),
                    'sample_size': len(sample)
                }
                
            else:
                return self._format_error(f"Unknown test type: {test_type}")
            
            return self._format_success(result)
            
        except Exception as e:
            return self._format_error(f"Error performing hypothesis test: {str(e)}")
    
    async def _correlation_analysis(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Perform correlation analysis."""
        data = params.get('data', [])
        columns = params.get('columns', [])
        method = params.get('method', 'pearson')  # pearson, spearman, kendall
        
        if not data:
            return self._format_error("Data is required")
        
        try:
            df = pd.DataFrame(data)
            
            # Select columns to analyze
            if columns:
                df = df[columns]
            
            # Get numerical columns
            numerical_cols = df.select_dtypes(include=[np.number]).columns
            
            if len(numerical_cols) < 2:
                return self._format_error("Need at least 2 numerical columns for correlation analysis")
            
            # Calculate correlation matrix
            corr_matrix = df[numerical_cols].corr(method=method)
            
            # Calculate p-values for correlations
            p_values = pd.DataFrame(index=numerical_cols, columns=numerical_cols)
            
            for i in numerical_cols:
                for j in numerical_cols:
                    if i == j:
                        p_values.loc[i, j] = 1.0
                    else:
                        if method == 'pearson':
                            _, p_val = pearsonr(df[i].dropna(), df[j].dropna())
                        elif method == 'spearman':
                            _, p_val = spearmanr(df[i].dropna(), df[j].dropna())
                        else:
                            p_val = 1.0  # Default for kendall
                        p_values.loc[i, j] = p_val
            
            # Find significant correlations
            significant_correlations = []
            for i in range(len(numerical_cols)):
                for j in range(i+1, len(numerical_cols)):
                    col1 = numerical_cols[i]
                    col2 = numerical_cols[j]
                    corr_val = corr_matrix.loc[col1, col2]
                    p_val = p_values.loc[col1, col2]
                    
                    if p_val < self.significance_level:
                        significant_correlations.append({
                            'variable1': col1,
                            'variable2': col2,
                            'correlation': float(corr_val),
                            'p_value': float(p_val),
                            'strength': self._get_correlation_strength(abs(corr_val))
                        })
            
            # Sort by absolute correlation value
            significant_correlations.sort(key=lambda x: abs(x['correlation']), reverse=True)
            
            return self._format_success({
                'correlation_matrix': corr_matrix.to_dict(),
                'p_values': p_values.to_dict(),
                'method': method,
                'significant_correlations': significant_correlations,
                'total_correlations': len(significant_correlations),
                'columns_analyzed': list(numerical_cols)
            })
            
        except Exception as e:
            return self._format_error(f"Error performing correlation analysis: {str(e)}")
    
    async def _regression_analysis(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Perform regression analysis."""
        data = params.get('data', [])
        target_column = params.get('target_column', '')
        feature_columns = params.get('feature_columns', [])
        regression_type = params.get('regression_type', 'linear')  # linear, logistic
        
        if not data:
            return self._format_error("Data is required")
        
        if not target_column:
            return self._format_error("Target column is required")
        
        if not feature_columns:
            return self._format_error("Feature columns are required")
        
        try:
            df = pd.DataFrame(data)
            
            # Check if columns exist
            if target_column not in df.columns:
                return self._format_error("Target column not found")
            
            missing_features = [col for col in feature_columns if col not in df.columns]
            if missing_features:
                return self._format_error(f"Feature columns not found: {missing_features}")
            
            # Prepare data
            X = df[feature_columns].dropna()
            y = df[target_column].dropna()
            
            # Align indices
            common_index = X.index.intersection(y.index)
            X = X.loc[common_index]
            y = y.loc[common_index]
            
            if len(X) < len(feature_columns) + 1:
                return self._format_error("Insufficient data for regression")
            
            # Standardize features
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)
            
            if regression_type == 'linear':
                # Linear regression
                model = LinearRegression()
                model.fit(X_scaled, y)
                
                # Predictions
                y_pred = model.predict(X_scaled)
                
                # Metrics
                mse = mean_squared_error(y, y_pred)
                r2 = r2_score(y, y_pred)
                rmse = np.sqrt(mse)
                
                # Coefficients
                coefficients = {}
                for i, feature in enumerate(feature_columns):
                    coefficients[feature] = float(model.coef_[i])
                
                result = {
                    'regression_type': 'Linear Regression',
                    'intercept': float(model.intercept_),
                    'coefficients': coefficients,
                    'r_squared': float(r2),
                    'adjusted_r_squared': float(1 - (1-r2)*(len(y)-1)/(len(y)-len(feature_columns)-1)),
                    'mse': float(mse),
                    'rmse': float(rmse),
                    'sample_size': len(y),
                    'feature_count': len(feature_columns)
                }
                
            elif regression_type == 'logistic':
                # Logistic regression
                # Ensure target is binary
                unique_values = y.unique()
                if len(unique_values) != 2:
                    return self._format_error("Target must have exactly 2 unique values for logistic regression")
                
                model = LogisticRegression(random_state=42)
                model.fit(X_scaled, y)
                
                # Predictions
                y_pred = model.predict(X_scaled)
                y_pred_proba = model.predict_proba(X_scaled)[:, 1]
                
                # Metrics
                accuracy = accuracy_score(y, y_pred)
                
                # Coefficients
                coefficients = {}
                for i, feature in enumerate(feature_columns):
                    coefficients[feature] = float(model.coef_[0][i])
                
                result = {
                    'regression_type': 'Logistic Regression',
                    'intercept': float(model.intercept_[0]),
                    'coefficients': coefficients,
                    'accuracy': float(accuracy),
                    'sample_size': len(y),
                    'feature_count': len(feature_columns),
                    'class_distribution': y.value_counts().to_dict()
                }
                
            else:
                return self._format_error(f"Unknown regression type: {regression_type}")
            
            return self._format_success(result)
            
        except Exception as e:
            return self._format_error(f"Error performing regression analysis: {str(e)}")
    
    async def _distribution_test(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Test if data follows a specific distribution."""
        data = params.get('data', [])
        column = params.get('column', '')
        distribution = params.get('distribution', 'normal')  # normal, uniform, exponential
        
        if not data:
            return self._format_error("Data is required")
        
        if not column:
            return self._format_error("Column is required")
        
        try:
            df = pd.DataFrame(data)
            
            if column not in df.columns:
                return self._format_error("Specified column not found")
            
            sample = df[column].dropna()
            
            if len(sample) < 10:
                return self._format_error("Insufficient data for distribution test")
            
            if distribution == 'normal':
                # Kolmogorov-Smirnov test for normality
                statistic, p_value = stats.kstest(sample, 'norm', args=(sample.mean(), sample.std()))
                
                # Shapiro-Wilk test for normality
                shapiro_stat, shapiro_p = stats.shapiro(sample)
                
                result = {
                    'distribution': 'Normal',
                    'ks_test': {
                        'statistic': float(statistic),
                        'p_value': float(p_value),
                        'significant': p_value < self.significance_level
                    },
                    'shapiro_test': {
                        'statistic': float(shapiro_stat),
                        'p_value': float(shapiro_p),
                        'significant': shapiro_p < self.significance_level
                    },
                    'sample_mean': float(sample.mean()),
                    'sample_std': float(sample.std()),
                    'sample_size': len(sample)
                }
                
            elif distribution == 'uniform':
                # Kolmogorov-Smirnov test for uniform distribution
                statistic, p_value = stats.kstest(sample, 'uniform', args=(sample.min(), sample.max() - sample.min()))
                
                result = {
                    'distribution': 'Uniform',
                    'ks_test': {
                        'statistic': float(statistic),
                        'p_value': float(p_value),
                        'significant': p_value < self.significance_level
                    },
                    'sample_min': float(sample.min()),
                    'sample_max': float(sample.max()),
                    'sample_size': len(sample)
                }
                
            elif distribution == 'exponential':
                # Kolmogorov-Smirnov test for exponential distribution
                statistic, p_value = stats.kstest(sample, 'expon', args=(0, sample.mean()))
                
                result = {
                    'distribution': 'Exponential',
                    'ks_test': {
                        'statistic': float(statistic),
                        'p_value': float(p_value),
                        'significant': p_value < self.significance_level
                    },
                    'sample_mean': float(sample.mean()),
                    'sample_size': len(sample)
                }
                
            else:
                return self._format_error(f"Unknown distribution: {distribution}")
            
            return self._format_success(result)
            
        except Exception as e:
            return self._format_error(f"Error performing distribution test: {str(e)}")
    
    async def _outlier_detection(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Detect outliers in data."""
        data = params.get('data', [])
        columns = params.get('columns', [])
        method = params.get('method', 'iqr')  # iqr, zscore, isolation_forest
        
        if not data:
            return self._format_error("Data is required")
        
        try:
            df = pd.DataFrame(data)
            
            # Select columns to analyze
            if columns:
                df = df[columns]
            
            # Get numerical columns
            numerical_cols = df.select_dtypes(include=[np.number]).columns
            
            if len(numerical_cols) == 0:
                return self._format_error("No numerical columns found")
            
            results = {}
            
            for col in numerical_cols:
                series = df[col].dropna()
                
                if len(series) == 0:
                    results[col] = {'error': 'No valid data'}
                    continue
                
                outliers = []
                
                if method == 'iqr':
                    # IQR method
                    Q1 = series.quantile(0.25)
                    Q3 = series.quantile(0.75)
                    IQR = Q3 - Q1
                    lower_bound = Q1 - 1.5 * IQR
                    upper_bound = Q3 + 1.5 * IQR
                    
                    outlier_indices = series[(series < lower_bound) | (series > upper_bound)].index
                    outliers = [{'index': int(idx), 'value': float(series[idx])} for idx in outlier_indices]
                    
                    results[col] = {
                        'method': 'IQR',
                        'q1': float(Q1),
                        'q3': float(Q3),
                        'iqr': float(IQR),
                        'lower_bound': float(lower_bound),
                        'upper_bound': float(upper_bound),
                        'outliers': outliers,
                        'outlier_count': len(outliers),
                        'outlier_percentage': float(len(outliers) / len(series) * 100)
                    }
                    
                elif method == 'zscore':
                    # Z-score method
                    z_scores = np.abs(stats.zscore(series))
                    outlier_indices = series[z_scores > 3].index
                    outliers = [{'index': int(idx), 'value': float(series[idx]), 'z_score': float(z_scores[series.index.get_loc(idx)])} for idx in outlier_indices]
                    
                    results[col] = {
                        'method': 'Z-Score',
                        'threshold': 3,
                        'outliers': outliers,
                        'outlier_count': len(outliers),
                        'outlier_percentage': float(len(outliers) / len(series) * 100)
                    }
                    
                else:
                    return self._format_error(f"Unknown outlier detection method: {method}")
            
            return self._format_success({
                'outlier_analysis': results,
                'method': method,
                'columns_analyzed': list(numerical_cols)
            })
            
        except Exception as e:
            return self._format_error(f"Error detecting outliers: {str(e)}")
    
    async def _anova_analysis(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Perform ANOVA analysis."""
        data = params.get('data', [])
        group_column = params.get('group_column', '')
        value_column = params.get('value_column', '')
        
        if not data:
            return self._format_error("Data is required")
        
        if not group_column or not value_column:
            return self._format_error("Group column and value column are required")
        
        try:
            df = pd.DataFrame(data)
            
            if group_column not in df.columns or value_column not in df.columns:
                return self._format_error("Specified columns not found")
            
            # Remove missing values
            valid_data = df[[group_column, value_column]].dropna()
            
            if len(valid_data) < 3:
                return self._format_error("Insufficient data for ANOVA")
            
            # Perform one-way ANOVA
            groups = [group for _, group in valid_data.groupby(group_column)[value_column]]
            
            if len(groups) < 2:
                return self._format_error("Need at least 2 groups for ANOVA")
            
            statistic, p_value = stats.f_oneway(*groups)
            
            # Calculate group statistics
            group_stats = {}
            for group_name, group_data in valid_data.groupby(group_column):
                group_stats[group_name] = {
                    'count': len(group_data),
                    'mean': float(group_data[value_column].mean()),
                    'std': float(group_data[value_column].std()),
                    'min': float(group_data[value_column].min()),
                    'max': float(group_data[value_column].max())
                }
            
            result = {
                'test_type': 'One-way ANOVA',
                'statistic': float(statistic),
                'p_value': float(p_value),
                'significant': p_value < self.significance_level,
                'group_count': len(groups),
                'total_sample_size': len(valid_data),
                'group_statistics': group_stats
            }
            
            return self._format_success(result)
            
        except Exception as e:
            return self._format_error(f"Error performing ANOVA: {str(e)}")
    
    async def _chi_square_test(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Perform chi-square test of independence."""
        data = params.get('data', [])
        column1 = params.get('column1', '')
        column2 = params.get('column2', '')
        
        if not data:
            return self._format_error("Data is required")
        
        if not column1 or not column2:
            return self._format_error("Two columns are required for chi-square test")
        
        try:
            df = pd.DataFrame(data)
            
            if column1 not in df.columns or column2 not in df.columns:
                return self._format_error("Specified columns not found")
            
            # Create contingency table
            contingency_table = pd.crosstab(df[column1], df[column2])
            
            if contingency_table.shape[0] < 2 or contingency_table.shape[1] < 2:
                return self._format_error("Need at least 2 categories in each variable")
            
            # Perform chi-square test
            statistic, p_value, dof, expected = chi2_contingency(contingency_table)
            
            result = {
                'test_type': 'Chi-square test of independence',
                'statistic': float(statistic),
                'p_value': float(p_value),
                'degrees_of_freedom': int(dof),
                'significant': p_value < self.significance_level,
                'contingency_table': contingency_table.to_dict(),
                'expected_frequencies': expected.tolist(),
                'row_count': contingency_table.shape[0],
                'column_count': contingency_table.shape[1]
            }
            
            return self._format_success(result)
            
        except Exception as e:
            return self._format_error(f"Error performing chi-square test: {str(e)}")
    
    async def _normality_test(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Test for normality of data."""
        data = params.get('data', [])
        columns = params.get('columns', [])
        
        if not data:
            return self._format_error("Data is required")
        
        try:
            df = pd.DataFrame(data)
            
            # Select columns to analyze
            if columns:
                df = df[columns]
            
            # Get numerical columns
            numerical_cols = df.select_dtypes(include=[np.number]).columns
            
            if len(numerical_cols) == 0:
                return self._format_error("No numerical columns found")
            
            results = {}
            
            for col in numerical_cols:
                series = df[col].dropna()
                
                if len(series) < 3:
                    results[col] = {'error': 'Insufficient data'}
                    continue
                
                # Shapiro-Wilk test
                shapiro_stat, shapiro_p = stats.shapiro(series)
                
                # Anderson-Darling test
                anderson_result = stats.anderson(series)
                
                # Kolmogorov-Smirnov test
                ks_stat, ks_p = stats.kstest(series, 'norm', args=(series.mean(), series.std()))
                
                results[col] = {
                    'shapiro_wilk': {
                        'statistic': float(shapiro_stat),
                        'p_value': float(shapiro_p),
                        'significant': shapiro_p < self.significance_level
                    },
                    'anderson_darling': {
                        'statistic': float(anderson_result.statistic),
                        'critical_values': anderson_result.critical_values.tolist(),
                    },
                    'kolmogorov_smirnov': {
                        'statistic': float(ks_stat),
                        'p_value': float(ks_p),
                        'significant': ks_p < self.significance_level
                    },
                    'sample_size': len(series),
                    'mean': float(series.mean()),
                    'std': float(series.std())
                }
            
            return self._format_success({
                'normality_tests': results,
                'columns_analyzed': list(numerical_cols)
            })
            
        except Exception as e:
            return self._format_error(f"Error performing normality test: {str(e)}")
    
    def _get_correlation_strength(self, correlation_value: float) -> str:
        """Get correlation strength description."""
        abs_corr = abs(correlation_value)
        if abs_corr >= 0.8:
            return 'Very Strong'
        elif abs_corr >= 0.6:
            return 'Strong'
        elif abs_corr >= 0.4:
            return 'Moderate'
        elif abs_corr >= 0.2:
            return 'Weak'
        else:
            return 'Very Weak' 