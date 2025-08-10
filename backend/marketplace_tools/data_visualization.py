"""
Data Visualization Tool

This tool provides functionality to create charts and graphs from data.
It supports various chart types and can export visualizations in different formats.
"""

import asyncio
import base64
import io
import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Union
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import numpy as np
from matplotlib.figure import Figure
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots

from .base import BaseTool

logger = logging.getLogger(__name__)

class DataVisualizationTool(BaseTool):
    """
    Tool for creating charts and graphs from data.
    
    Features:
    - Multiple chart types (bar, line, scatter, pie, histogram, etc.)
    - Interactive and static visualizations
    - Custom styling and theming
    - Export to various formats (PNG, SVG, HTML)
    - Statistical visualizations
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.name = "Data Visualization"
        self.description = "Create charts and graphs from data"
        self.category = "Analytics"
        self.tool_type = "Function"
        
        # Configuration
        self.default_theme = config.get('theme', 'default')
        self.default_figsize = config.get('figsize', (10, 6))
        self.output_format = config.get('output_format', 'png')
        self.dpi = config.get('dpi', 300)
        
        # Set matplotlib style
        plt.style.use('default')
        sns.set_palette("husl")
        
    async def execute(self, **kwargs) -> Dict[str, Any]:
        """
        Execute visualization operation with given parameters.
        
        Args:
            action: Operation to perform (create_chart, export, etc.)
            chart_type: Type of chart to create
            data: Data to visualize
            x_column: Column for x-axis
            y_column: Column for y-axis
            title: Chart title
            x_label: X-axis label
            y_label: Y-axis label
            color_column: Column for color coding
            size_column: Column for size coding
            chart_options: Additional chart-specific options
            
        Returns:
            Dictionary containing visualization result
        """
        action = kwargs.get('action', 'create_chart')
        
        try:
            if action == 'create_chart':
                return await self._create_chart(kwargs)
            elif action == 'export_chart':
                return await self._export_chart(kwargs)
            elif action == 'create_dashboard':
                return await self._create_dashboard(kwargs)
            elif action == 'statistical_plot':
                return await self._statistical_plot(kwargs)
            elif action == 'interactive_chart':
                return await self._interactive_chart(kwargs)
            else:
                return self._format_error(f"Unknown action: {action}")
                
        except Exception as e:
            logger.error(f"Error in visualization operation: {str(e)}")
            return self._format_error(f"Visualization operation failed: {str(e)}")
    
    async def _create_chart(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Create a chart from data."""
        chart_type = params.get('chart_type', 'bar')
        data = params.get('data', [])
        x_column = params.get('x_column', '')
        y_column = params.get('y_column', '')
        title = params.get('title', '')
        x_label = params.get('x_label', '')
        y_label = params.get('y_label', '')
        color_column = params.get('color_column', '')
        size_column = params.get('size_column', '')
        chart_options = params.get('chart_options', {})
        
        if not data:
            return self._format_error("Data is required")
        
        try:
            df = pd.DataFrame(data)
            
            # Create figure
            fig, ax = plt.subplots(figsize=self.default_figsize)
            
            if chart_type == 'bar':
                chart_data = await self._create_bar_chart(
                    df, x_column, y_column, color_column, chart_options, ax
                )
            elif chart_type == 'line':
                chart_data = await self._create_line_chart(
                    df, x_column, y_column, color_column, chart_options, ax
                )
            elif chart_type == 'scatter':
                chart_data = await self._create_scatter_chart(
                    df, x_column, y_column, color_column, size_column, chart_options, ax
                )
            elif chart_type == 'pie':
                chart_data = await self._create_pie_chart(
                    df, x_column, y_column, chart_options, ax
                )
            elif chart_type == 'histogram':
                chart_data = await self._create_histogram(
                    df, x_column, color_column, chart_options, ax
                )
            elif chart_type == 'box':
                chart_data = await self._create_box_chart(
                    df, x_column, y_column, color_column, chart_options, ax
                )
            elif chart_type == 'heatmap':
                chart_data = await self._create_heatmap(
                    df, x_column, y_column, chart_options, ax
                )
            else:
                return self._format_error(f"Unknown chart type: {chart_type}")
            
            # Set labels and title
            if title:
                ax.set_title(title, fontsize=14, fontweight='bold')
            if x_label:
                ax.set_xlabel(x_label)
            if y_label:
                ax.set_ylabel(y_label)
            
            # Apply theme
            self._apply_theme(ax, chart_options.get('theme', self.default_theme))
            
            # Convert to base64
            img_data = self._figure_to_base64(fig)
            
            plt.close(fig)
            
            return self._format_success({
                'chart_type': chart_type,
                'image_data': img_data,
                'chart_data': chart_data,
                'title': title,
                'dimensions': self.default_figsize
            })
            
        except Exception as e:
            return self._format_error(f"Error creating chart: {str(e)}")
    
    async def _create_bar_chart(self, df: pd.DataFrame, x_column: str, y_column: str,
                               color_column: str, options: Dict[str, Any], ax: plt.Axes) -> Dict[str, Any]:
        """Create a bar chart."""
        if not x_column or not y_column:
            return {'error': 'X and Y columns are required for bar chart'}
        
        if x_column not in df.columns or y_column not in df.columns:
            return {'error': 'Specified columns not found in data'}
        
        # Prepare data
        if color_column and color_column in df.columns:
            grouped = df.groupby([x_column, color_column])[y_column].sum().reset_index()
            pivot_data = grouped.pivot(index=x_column, columns=color_column, values=y_column)
            pivot_data.plot(kind='bar', ax=ax, stacked=options.get('stacked', False))
        else:
            df.plot(x=x_column, y=y_column, kind='bar', ax=ax)
        
        # Rotate x-axis labels if needed
        if len(df[x_column].unique()) > 10:
            ax.tick_params(axis='x', rotation=45)
        
        return {
            'x_column': x_column,
            'y_column': y_column,
            'color_column': color_column,
            'data_points': len(df)
        }
    
    async def _create_line_chart(self, df: pd.DataFrame, x_column: str, y_column: str,
                                color_column: str, options: Dict[str, Any], ax: plt.Axes) -> Dict[str, Any]:
        """Create a line chart."""
        if not x_column or not y_column:
            return {'error': 'X and Y columns are required for line chart'}
        
        if x_column not in df.columns or y_column not in df.columns:
            return {'error': 'Specified columns not found in data'}
        
        # Sort by x column for proper line plotting
        df_sorted = df.sort_values(x_column)
        
        if color_column and color_column in df.columns:
            for color_value in df_sorted[color_column].unique():
                subset = df_sorted[df_sorted[color_column] == color_value]
                ax.plot(subset[x_column], subset[y_column], 
                       label=str(color_value), marker=options.get('marker', 'o'))
            ax.legend()
        else:
            ax.plot(df_sorted[x_column], df_sorted[y_column], 
                   marker=options.get('marker', 'o'))
        
        return {
            'x_column': x_column,
            'y_column': y_column,
            'color_column': color_column,
            'data_points': len(df)
        }
    
    async def _create_scatter_chart(self, df: pd.DataFrame, x_column: str, y_column: str,
                                   color_column: str, size_column: str, 
                                   options: Dict[str, Any], ax: plt.Axes) -> Dict[str, Any]:
        """Create a scatter chart."""
        if not x_column or not y_column:
            return {'error': 'X and Y columns are required for scatter chart'}
        
        if x_column not in df.columns or y_column not in df.columns:
            return {'error': 'Specified columns not found in data'}
        
        # Prepare scatter plot parameters
        scatter_kwargs = {
            'x': df[x_column],
            'y': df[y_column],
            'alpha': options.get('alpha', 0.6)
        }
        
        if color_column and color_column in df.columns:
            scatter_kwargs['c'] = df[color_column]
            scatter_kwargs['cmap'] = options.get('colormap', 'viridis')
        
        if size_column and size_column in df.columns:
            scatter_kwargs['s'] = df[size_column] * options.get('size_scale', 100)
        
        scatter = ax.scatter(**scatter_kwargs)
        
        # Add colorbar if color column is used
        if color_column and color_column in df.columns:
            plt.colorbar(scatter, ax=ax, label=color_column)
        
        return {
            'x_column': x_column,
            'y_column': y_column,
            'color_column': color_column,
            'size_column': size_column,
            'data_points': len(df)
        }
    
    async def _create_pie_chart(self, df: pd.DataFrame, x_column: str, y_column: str,
                               options: Dict[str, Any], ax: plt.Axes) -> Dict[str, Any]:
        """Create a pie chart."""
        if not x_column or not y_column:
            return {'error': 'X and Y columns are required for pie chart'}
        
        if x_column not in df.columns or y_column not in df.columns:
            return {'error': 'Specified columns not found in data'}
        
        # Aggregate data
        pie_data = df.groupby(x_column)[y_column].sum()
        
        # Create pie chart
        wedges, texts, autotexts = ax.pie(
            pie_data.values,
            labels=pie_data.index,
            autopct=options.get('autopct', '%1.1f%%'),
            startangle=options.get('startangle', 90)
        )
        
        return {
            'x_column': x_column,
            'y_column': y_column,
            'categories': len(pie_data),
            'total_value': pie_data.sum()
        }
    
    async def _create_histogram(self, df: pd.DataFrame, x_column: str, color_column: str,
                               options: Dict[str, Any], ax: plt.Axes) -> Dict[str, Any]:
        """Create a histogram."""
        if not x_column:
            return {'error': 'X column is required for histogram'}
        
        if x_column not in df.columns:
            return {'error': 'Specified column not found in data'}
        
        bins = options.get('bins', 30)
        alpha = options.get('alpha', 0.7)
        
        if color_column and color_column in df.columns:
            for color_value in df[color_column].unique():
                subset = df[df[color_column] == color_value]
                ax.hist(subset[x_column], bins=bins, alpha=alpha, 
                       label=str(color_value))
            ax.legend()
        else:
            ax.hist(df[x_column], bins=bins, alpha=alpha)
        
        return {
            'x_column': x_column,
            'color_column': color_column,
            'bins': bins,
            'data_points': len(df)
        }
    
    async def _create_box_chart(self, df: pd.DataFrame, x_column: str, y_column: str,
                               color_column: str, options: Dict[str, Any], ax: plt.Axes) -> Dict[str, Any]:
        """Create a box chart."""
        if not x_column or not y_column:
            return {'error': 'X and Y columns are required for box chart'}
        
        if x_column not in df.columns or y_column not in df.columns:
            return {'error': 'Specified columns not found in data'}
        
        if color_column and color_column in df.columns:
            df.boxplot(column=y_column, by=[x_column, color_column], ax=ax)
        else:
            df.boxplot(column=y_column, by=x_column, ax=ax)
        
        return {
            'x_column': x_column,
            'y_column': y_column,
            'color_column': color_column,
            'data_points': len(df)
        }
    
    async def _create_heatmap(self, df: pd.DataFrame, x_column: str, y_column: str,
                             options: Dict[str, Any], ax: plt.Axes) -> Dict[str, Any]:
        """Create a heatmap."""
        if not x_column or not y_column:
            return {'error': 'X and Y columns are required for heatmap'}
        
        if x_column not in df.columns or y_column not in df.columns:
            return {'error': 'Specified columns not found in data'}
        
        # Create pivot table for heatmap
        pivot_table = df.pivot_table(
            values=y_column,
            index=df[x_column],
            columns=df[x_column] if x_column == y_column else None,
            aggfunc='mean'
        )
        
        # Create heatmap
        sns.heatmap(pivot_table, annot=options.get('annotate', True), 
                   cmap=options.get('colormap', 'viridis'), ax=ax)
        
        return {
            'x_column': x_column,
            'y_column': y_column,
            'matrix_size': pivot_table.shape,
            'data_points': len(df)
        }
    
    async def _interactive_chart(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Create an interactive chart using Plotly."""
        chart_type = params.get('chart_type', 'scatter')
        data = params.get('data', [])
        x_column = params.get('x_column', '')
        y_column = params.get('y_column', '')
        title = params.get('title', '')
        color_column = params.get('color_column', '')
        size_column = params.get('size_column', '')
        chart_options = params.get('chart_options', {})
        
        if not data:
            return self._format_error("Data is required")
        
        try:
            df = pd.DataFrame(data)
            
            if chart_type == 'scatter':
                if color_column and color_column in df.columns:
                    fig = px.scatter(df, x=x_column, y=y_column, color=color_column,
                                   title=title, **chart_options)
                else:
                    fig = px.scatter(df, x=x_column, y=y_column, title=title, **chart_options)
                    
            elif chart_type == 'line':
                if color_column and color_column in df.columns:
                    fig = px.line(df, x=x_column, y=y_column, color=color_column,
                                title=title, **chart_options)
                else:
                    fig = px.line(df, x=x_column, y=y_column, title=title, **chart_options)
                    
            elif chart_type == 'bar':
                if color_column and color_column in df.columns:
                    fig = px.bar(df, x=x_column, y=y_column, color=color_column,
                               title=title, **chart_options)
                else:
                    fig = px.bar(df, x=x_column, y=y_column, title=title, **chart_options)
                    
            elif chart_type == 'pie':
                fig = px.pie(df, values=y_column, names=x_column, title=title, **chart_options)
                
            elif chart_type == 'histogram':
                fig = px.histogram(df, x=x_column, title=title, **chart_options)
                
            else:
                return self._format_error(f"Unknown chart type: {chart_type}")
            
            # Convert to HTML
            html_content = fig.to_html(include_plotlyjs=True, full_html=False)
            
            return self._format_success({
                'chart_type': chart_type,
                'html_content': html_content,
                'title': title,
                'interactive': True
            })
            
        except Exception as e:
            return self._format_error(f"Error creating interactive chart: {str(e)}")
    
    async def _statistical_plot(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Create statistical plots."""
        plot_type = params.get('plot_type', 'correlation')
        data = params.get('data', [])
        columns = params.get('columns', [])
        
        if not data:
            return self._format_error("Data is required")
        
        try:
            df = pd.DataFrame(data)
            
            if plot_type == 'correlation':
                # Correlation matrix heatmap
                numerical_cols = df.select_dtypes(include=[np.number]).columns
                if len(numerical_cols) < 2:
                    return self._format_error("Need at least 2 numerical columns for correlation")
                
                corr_matrix = df[numerical_cols].corr()
                
                fig, ax = plt.subplots(figsize=self.default_figsize)
                sns.heatmap(corr_matrix, annot=True, cmap='coolwarm', center=0, ax=ax)
                ax.set_title('Correlation Matrix')
                
                img_data = self._figure_to_base64(fig)
                plt.close(fig)
                
                return self._format_success({
                    'plot_type': plot_type,
                    'image_data': img_data,
                    'correlation_matrix': corr_matrix.to_dict()
                })
                
            elif plot_type == 'distribution':
                # Distribution plots for numerical columns
                if not columns:
                    columns = df.select_dtypes(include=[np.number]).columns.tolist()
                
                n_cols = len(columns)
                if n_cols == 0:
                    return self._format_error("No numerical columns found")
                
                fig, axes = plt.subplots(1, n_cols, figsize=(5*n_cols, 5))
                if n_cols == 1:
                    axes = [axes]
                
                for i, col in enumerate(columns):
                    if col in df.columns:
                        sns.histplot(df[col], kde=True, ax=axes[i])
                        axes[i].set_title(f'Distribution of {col}')
                
                img_data = self._figure_to_base64(fig)
                plt.close(fig)
                
                return self._format_success({
                    'plot_type': plot_type,
                    'image_data': img_data,
                    'columns_analyzed': columns
                })
                
            else:
                return self._format_error(f"Unknown statistical plot type: {plot_type}")
                
        except Exception as e:
            return self._format_error(f"Error creating statistical plot: {str(e)}")
    
    async def _create_dashboard(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Create a dashboard with multiple charts."""
        charts = params.get('charts', [])
        layout = params.get('layout', '2x2')
        
        if not charts:
            return self._format_error("Charts configuration is required")
        
        try:
            # Parse layout
            rows, cols = map(int, layout.split('x'))
            fig, axes = plt.subplots(rows, cols, figsize=(5*cols, 4*rows))
            
            if rows == 1 and cols == 1:
                axes = [[axes]]
            elif rows == 1:
                axes = [axes]
            elif cols == 1:
                axes = [[ax] for ax in axes]
            
            dashboard_data = []
            
            for i, chart_config in enumerate(charts):
                if i >= rows * cols:
                    break
                
                row = i // cols
                col = i % cols
                ax = axes[row][col]
                
                # Create individual chart
                chart_result = await self._create_chart({
                    **chart_config,
                    'ax': ax
                })
                
                if chart_result.get('success'):
                    dashboard_data.append(chart_result['result'])
            
            # Remove empty subplots
            for i in range(len(charts), rows * cols):
                row = i // cols
                col = i % cols
                fig.delaxes(axes[row][col])
            
            img_data = self._figure_to_base64(fig)
            plt.close(fig)
            
            return self._format_success({
                'dashboard_layout': layout,
                'image_data': img_data,
                'charts': dashboard_data,
                'total_charts': len(dashboard_data)
            })
            
        except Exception as e:
            return self._format_error(f"Error creating dashboard: {str(e)}")
    
    async def _export_chart(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Export chart to various formats."""
        chart_data = params.get('chart_data', {})
        format_type = params.get('format', 'png')
        filename = params.get('filename', f'chart_{datetime.now().strftime("%Y%m%d_%H%M%S")}')
        
        if not chart_data:
            return self._format_error("Chart data is required")
        
        try:
            # This would typically save to a file or return the data
            # For now, we'll return the base64 data with format info
            return self._format_success({
                'format': format_type,
                'filename': f"{filename}.{format_type}",
                'data': chart_data.get('image_data', ''),
                'exported_at': datetime.now().isoformat()
            })
            
        except Exception as e:
            return self._format_error(f"Error exporting chart: {str(e)}")
    
    def _apply_theme(self, ax: plt.Axes, theme: str):
        """Apply visual theme to the chart."""
        if theme == 'dark':
            ax.set_facecolor('#2E2E2E')
            ax.figure.patch.set_facecolor('#2E2E2E')
            ax.tick_params(colors='white')
            ax.xaxis.label.set_color('white')
            ax.yaxis.label.set_color('white')
            ax.title.set_color('white')
        elif theme == 'minimal':
            ax.spines['top'].set_visible(False)
            ax.spines['right'].set_visible(False)
            ax.grid(True, alpha=0.3)
    
    def _figure_to_base64(self, fig: Figure) -> str:
        """Convert matplotlib figure to base64 string."""
        buffer = io.BytesIO()
        fig.savefig(buffer, format=self.output_format, dpi=self.dpi, bbox_inches='tight')
        buffer.seek(0)
        img_data = base64.b64encode(buffer.getvalue()).decode()
        buffer.close()
        return img_data 