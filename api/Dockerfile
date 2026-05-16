FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy the csproj and restore
COPY ["HTLogistics.Api/HTLogisticsV2.Api.csproj", "HTLogistics.Api/"]
RUN dotnet restore "HTLogistics.Api/HTLogisticsV2.Api.csproj"

# Copy the rest of the code and build
COPY . .
WORKDIR "/src/HTLogistics.Api"
RUN dotnet build "HTLogisticsV2.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "HTLogisticsV2.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Final stage/image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .

EXPOSE 5200
ENV ASPNETCORE_URLS=http://+:5200

ENTRYPOINT ["dotnet", "HTLogisticsV2.Api.dll"]
